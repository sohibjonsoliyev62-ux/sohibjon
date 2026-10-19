"""
AI Virtual Mouse — qo'l harakatlari bilan kompyuter sichqonchasini boshqarish.

Imo-ishoralar (bitta qo'l):
  * Ko'rsatkich barmoq tik         -> kursorni yurgizish
  * Bosh + ko'rsatkich qisish      -> chap klik (tez ikki marta qisish = ikki marta klik)
  * Qisib ushlab turish            -> sudrab olib borish (drag & drop)
  * Bosh + o'rta barmoq qisish     -> o'ng klik
  * Ko'rsatkich + o'rta tik ("V")  -> skroll (qo'lni yuqoriga/pastga suring)
  * Musht (barcha barmoqlar bukik) -> pauza (kursor joyida qoladi)

Klaviatura (kamera oynasi faol bo'lganda):
  q / Esc  - chiqish          p - pauzani yoqish/o'chirish
  + / -    - silliqlikni oshirish/kamaytirish
  h        - yordam panelini ko'rsatish/yashirish

Favqulodda to'xtatish: sichqonchani ekranning istalgan burchagiga olib boring.
"""

import argparse
import math
import os
import time
from dataclasses import dataclass, field


# ----------------------------------------------------------------------------
# Sozlamalar
# ----------------------------------------------------------------------------
@dataclass
class Config:
    camera_index: int = 0
    cam_width: int = 640
    cam_height: int = 480
    max_hands: int = 1
    detection_conf: float = 0.7
    tracking_conf: float = 0.7

    # Kadr chetlaridan shu ulushdagi hudud ekranning to'liq yuzasiga moslanadi
    frame_margin: float = 0.15
    # Kursor silliqligi (1 = silliqlashsiz, kattaroq = silliqroq, lekin sekinroq)
    smooth_factor: float = 5.0

    # Qisish chegaralari qo'l o'lchamiga nisbatan (gisterezis: titrashga qarshi)
    pinch_on_ratio: float = 0.25
    pinch_off_ratio: float = 0.35

    # Qisib shuncha soniya ushlab turilsa — sudrash (drag) boshlanadi
    drag_hold_time: float = 0.35
    # Klikdan keyin qayta klik bloklanadigan vaqt (soniya)
    click_cooldown: float = 0.15

    # Skroll sezgirligi: qo'l kadr balandligining 1% ga siljisa, shuncha "tik"
    scroll_speed: float = 2.0
    # Skroll uchun o'lik zona (kadr balandligi ulushida)
    scroll_deadzone: float = 0.02


# ----------------------------------------------------------------------------
# Yordamchi geometriya
# ----------------------------------------------------------------------------
# MediaPipe landmark indekslari
WRIST, THUMB_TIP = 0, 4
INDEX_PIP, INDEX_TIP = 6, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP = 9, 10, 12
RING_PIP, RING_TIP = 14, 16
PINKY_PIP, PINKY_TIP = 18, 20


def _dist(a, b, w, h):
    return math.hypot((a[0] - b[0]) * w, (a[1] - b[1]) * h)


def fingers_up(lm):
    """[ko'rsatkich, o'rta, nomsiz, jimjiloq] — barmoq tik bo'lsa True."""
    return [
        lm[INDEX_TIP][1] < lm[INDEX_PIP][1],
        lm[MIDDLE_TIP][1] < lm[MIDDLE_PIP][1],
        lm[RING_TIP][1] < lm[RING_PIP][1],
        lm[PINKY_TIP][1] < lm[PINKY_PIP][1],
    ]


def interp(v, src_lo, src_hi, dst_lo, dst_hi):
    """np.interp kabi: chegaradan tashqari qiymatlar qirqiladi."""
    if src_hi == src_lo:
        return dst_lo
    t = (v - src_lo) / (src_hi - src_lo)
    t = min(max(t, 0.0), 1.0)
    return dst_lo + t * (dst_hi - dst_lo)


# ----------------------------------------------------------------------------
# Imo-ishoralarni tahlil qilib, sichqoncha amallariga aylantiruvchi mantiq
# (kamera va pyautogui'dan mustaqil — test qilish oson)
# ----------------------------------------------------------------------------
@dataclass
class ControllerState:
    mode: str = "Qo'l yo'q"
    left_pinched: bool = False
    right_pinched: bool = False
    pinch_start: float = 0.0
    dragging: bool = False
    last_click: float = 0.0
    prev_x: float = None
    prev_y: float = None
    scroll_anchor: float = None
    paused: bool = False
    ratio_left: float = 1.0
    ratio_right: float = 1.0


class GestureController:
    def __init__(self, cfg, mouse, screen_w, screen_h):
        self.cfg = cfg
        self.mouse = mouse
        self.sw, self.sh = screen_w, screen_h
        self.s = ControllerState()

    # --- kursor ---------------------------------------------------------
    def _move_cursor(self, nx, ny):
        c, s = self.cfg, self.s
        raw_x = interp(nx, c.frame_margin, 1 - c.frame_margin, 0, self.sw - 1)
        raw_y = interp(ny, c.frame_margin, 1 - c.frame_margin, 0, self.sh - 1)
        if s.prev_x is None:
            cx, cy = raw_x, raw_y
        else:
            f = max(c.smooth_factor, 1.0)
            cx = s.prev_x + (raw_x - s.prev_x) / f
            cy = s.prev_y + (raw_y - s.prev_y) / f
        s.prev_x, s.prev_y = cx, cy
        # Burchaklarga 1 piksel yetkazmaymiz, aks holda FAILSAFE o'zi ishlab ketadi
        self.mouse.move(min(max(cx, 1), self.sw - 2), min(max(cy, 1), self.sh - 2))

    def _end_drag(self):
        if self.s.dragging:
            self.mouse.up()
            self.s.dragging = False

    def release_all(self):
        """Qo'l yo'qolganda yoki pauzada: tugmalarni qo'yib yuboramiz."""
        self._end_drag()
        self.s.left_pinched = False
        self.s.right_pinched = False
        self.s.scroll_anchor = None

    def toggle_pause(self):
        self.s.paused = not self.s.paused
        if self.s.paused:
            self.release_all()

    # --- asosiy qadam -----------------------------------------------------
    def update(self, lm, cam_w, cam_h, now=None):
        """lm — 21 ta (x, y) normallashgan nuqta yoki None (qo'l topilmadi)."""
        c, s = self.cfg, self.s
        now = time.monotonic() if now is None else now

        if lm is None:
            self.release_all()
            s.mode = "Qo'l yo'q"
            return s.mode
        if s.paused:
            s.mode = "PAUZA (p)"
            return s.mode

        hand_size = _dist(lm[MIDDLE_MCP], lm[WRIST], cam_w, cam_h) or 1.0
        s.ratio_left = _dist(lm[THUMB_TIP], lm[INDEX_TIP], cam_w, cam_h) / hand_size
        s.ratio_right = _dist(lm[THUMB_TIP], lm[MIDDLE_TIP], cam_w, cam_h) / hand_size
        up = fingers_up(lm)
        ix, iy = lm[INDEX_TIP]

        # Chap qisish holati (gisterezis)
        left_now = s.ratio_left < c.pinch_on_ratio or (
            s.left_pinched and s.ratio_left < c.pinch_off_ratio)

        # 1) Chap qisish: klik / ikki marta klik / sudrash
        if left_now:
            if not s.left_pinched:
                s.left_pinched = True
                s.pinch_start = now
            held = now - s.pinch_start
            if not s.dragging and held >= c.drag_hold_time:
                self.mouse.down()
                s.dragging = True
            if s.dragging:
                self._move_cursor(ix, iy)
                s.mode = "Sudrash"
            else:
                s.mode = "Chap klik"  # qisish paytida kursor qotiriladi
            s.scroll_anchor = None
            return s.mode

        if s.left_pinched:  # qisish qo'yib yuborildi
            s.left_pinched = False
            if s.dragging:
                self._end_drag()
            elif now - s.last_click >= c.click_cooldown:
                self.mouse.click("left")
                s.last_click = now

        # 2) O'ng qisish (bosh + o'rta barmoq)
        right_now = s.ratio_right < c.pinch_on_ratio or (
            s.right_pinched and s.ratio_right < c.pinch_off_ratio)
        if right_now:
            if not s.right_pinched:
                s.right_pinched = True
                self.mouse.click("right")
                s.last_click = now
            s.mode = "O'ng klik"
            s.scroll_anchor = None
            return s.mode
        s.right_pinched = False

        # 3) Skroll: ko'rsatkich + o'rta tik, qolganlari bukik
        if up[0] and up[1] and not up[2] and not up[3]:
            if s.scroll_anchor is None:
                s.scroll_anchor = iy
            delta = s.scroll_anchor - iy  # yuqoriga = musbat
            if abs(delta) > c.scroll_deadzone:
                ticks = int(delta * 100 * c.scroll_speed)
                if ticks:
                    self.mouse.scroll(ticks)
                    s.scroll_anchor = iy
            s.mode = "Skroll"
            return s.mode
        s.scroll_anchor = None

        # 4) Musht — pauza (kursor qimirlamaydi)
        if not any(up):
            s.mode = "Musht (to'xtash)"
            return s.mode

        # 5) Ko'rsatkich tik — kursorni yurgizish
        if up[0]:
            self._move_cursor(ix, iy)
            s.mode = "Kursor"
            return s.mode

        s.mode = "Kutish"
        return s.mode


# ----------------------------------------------------------------------------
# pyautogui adapteri
# ----------------------------------------------------------------------------
class PyAutoGuiMouse:
    def __init__(self):
        import pyautogui
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0
        self.pg = pyautogui

    def size(self):
        return self.pg.size()

    def move(self, x, y):
        self.pg.moveTo(x, y)

    def click(self, button="left"):
        self.pg.click(button=button)

    def down(self):
        self.pg.mouseDown()

    def up(self):
        self.pg.mouseUp()

    def scroll(self, ticks):
        self.pg.scroll(ticks)


# ----------------------------------------------------------------------------
# Ekrandagi panel
# ----------------------------------------------------------------------------
HELP_LINES = [
    "Ko'rsatkich tik: kursor",
    "Bosh+ko'rsatkich qisish: chap klik",
    "Qisib ushlash: sudrash",
    "Bosh+o'rta qisish: o'ng klik",
    "V belgisi: skroll",
    "Musht: to'xtash",
    "q-chiqish p-pauza +/- silliqlik h-yordam",
]


def draw_hud(cv2, img, ctrl, cfg, fps, show_help):
    h, w = img.shape[:2]
    m = cfg.frame_margin
    color = (0, 0, 255) if ctrl.s.paused else (255, 0, 255)
    cv2.rectangle(img, (int(m * w), int(m * h)), (int((1 - m) * w), int((1 - m) * h)), color, 2)

    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 34), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.5, img, 0.5, 0, img)
    cv2.putText(img, f"FPS: {fps:4.1f}", (8, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.putText(img, f"Rejim: {ctrl.s.mode}", (130, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    cv2.putText(img, f"Silliqlik: {cfg.smooth_factor:.0f}", (w - 140, 23),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    if show_help:
        y = h - 12 - 20 * (len(HELP_LINES) - 1)
        for line in HELP_LINES:
            cv2.putText(img, line, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
            cv2.putText(img, line, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y += 20


# ----------------------------------------------------------------------------
# Dastur
# ----------------------------------------------------------------------------
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
]

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
             "hand_landmarker/float16/1/hand_landmarker.task")
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task")


def draw_hand(cv2, img, lm):
    h, w = img.shape[:2]
    pts = [(int(x * w), int(y * h)) for x, y in lm]
    for a, b in HAND_CONNECTIONS:
        cv2.line(img, pts[a], pts[b], (255, 255, 255), 2)
    for p in pts:
        cv2.circle(img, p, 4, (0, 0, 255), cv2.FILLED)


class LegacyHandTracker:
    """Eski mediapipe (0.10.x, mp.solutions mavjud) uchun."""

    def __init__(self, hands_module, cfg):
        self.hands = hands_module.Hands(
            static_image_mode=False, max_num_hands=cfg.max_hands,
            min_detection_confidence=cfg.detection_conf,
            min_tracking_confidence=cfg.tracking_conf)

    def process(self, rgb):
        res = self.hands.process(rgb)
        if res.multi_hand_landmarks:
            return [(p.x, p.y) for p in res.multi_hand_landmarks[0].landmark]
        return None

    def close(self):
        self.hands.close()


class TasksHandTracker:
    """Yangi mediapipe (0.10.30+, mp.solutions olib tashlangan) uchun — Tasks API."""

    def __init__(self, mp, cfg):
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        self.mp = mp
        options = vision.HandLandmarkerOptions(
            # Fayl yo'lida kirill/maxsus belgilar bo'lsa ham ishlashi uchun bufer orqali
            base_options=mp_python.BaseOptions(model_asset_buffer=_load_model_bytes()),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=cfg.max_hands,
            min_hand_detection_confidence=cfg.detection_conf,
            min_hand_presence_confidence=cfg.detection_conf,
            min_tracking_confidence=cfg.tracking_conf)
        self.landmarker = vision.HandLandmarker.create_from_options(options)
        self.last_ts = -1

    def process(self, rgb):
        # VIDEO rejimida vaqt belgisi qat'iy o'sib borishi shart
        ts = max(int(time.monotonic() * 1000), self.last_ts + 1)
        self.last_ts = ts
        image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb)
        res = self.landmarker.detect_for_video(image, ts)
        if res.hand_landmarks:
            return [(p.x, p.y) for p in res.hand_landmarks[0]]
        return None

    def close(self):
        self.landmarker.close()


def _load_model_bytes():
    if not os.path.exists(MODEL_PATH):
        import urllib.request
        print("Qo'l modeli (hand_landmarker.task, ~7.5 MB) yuklab olinmoqda...")
        tmp = MODEL_PATH + ".part"
        try:
            urllib.request.urlretrieve(MODEL_URL, tmp)
            os.replace(tmp, MODEL_PATH)
        except Exception as e:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise SystemExit(
                f"Modelni yuklab bo'lmadi: {e}\n"
                f"Qo'lda yuklab oling: {MODEL_URL}\n"
                f"va shu joyga saqlang: {MODEL_PATH}")
        print("Model yuklandi.")
    with open(MODEL_PATH, "rb") as f:
        return f.read()


def create_hand_tracker(cfg):
    import mediapipe as mp
    hands_module = None
    try:
        hands_module = mp.solutions.hands
    except AttributeError:
        try:
            import mediapipe.python.solutions.hands as hands_module
        except ImportError:
            hands_module = None
    if hands_module is not None:
        return LegacyHandTracker(hands_module, cfg)
    return TasksHandTracker(mp, cfg)


def parse_args():
    p = argparse.ArgumentParser(description="AI Virtual Mouse")
    p.add_argument("--camera", type=int, default=0, help="kamera raqami (odatda 0)")
    p.add_argument("--smooth", type=float, default=5.0, help="kursor silliqligi (1-15)")
    p.add_argument("--margin", type=float, default=0.15, help="kadr chetidagi hudud (0-0.4)")
    p.add_argument("--scroll", type=float, default=2.0, help="skroll tezligi")
    return p.parse_args()


def main():
    import cv2

    args = parse_args()
    cfg = Config(camera_index=args.camera, smooth_factor=args.smooth,
                 frame_margin=min(max(args.margin, 0.0), 0.4), scroll_speed=args.scroll)

    tracker = create_hand_tracker(cfg)
    mouse = PyAutoGuiMouse()
    screen_w, screen_h = mouse.size()
    ctrl = GestureController(cfg, mouse, screen_w, screen_h)

    cap = cv2.VideoCapture(cfg.camera_index)
    if not cap.isOpened():
        raise SystemExit(f"Kamera ochilmadi (raqami: {cfg.camera_index}). "
                         "--camera 1 bilan boshqa kamerani sinab ko'ring.")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, cfg.cam_width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, cfg.cam_height)

    print("Dastur ishga tushdi. Chiqish: kamera oynasida 'q' yoki sichqonchani ekran burchagiga.")
    show_help = True
    prev_t = time.monotonic()
    fps = 0.0

    try:
        while True:
            ok, img = cap.read()
            if not ok:
                print("Kameradan tasvir olinmadi.")
                break
            img = cv2.flip(img, 1)
            cam_h, cam_w = img.shape[:2]
            lm = tracker.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            if lm is not None:
                draw_hand(cv2, img, lm)

            mode = ctrl.update(lm, cam_w, cam_h)
            if lm is not None and mode in ("Chap klik", "Sudrash"):
                x, y = int(lm[INDEX_TIP][0] * cam_w), int(lm[INDEX_TIP][1] * cam_h)
                cv2.circle(img, (x, y), 12, (0, 255, 0), cv2.FILLED)

            now = time.monotonic()
            fps = 0.9 * fps + 0.1 * (1.0 / max(now - prev_t, 1e-6))
            prev_t = now
            draw_hud(cv2, img, ctrl, cfg, fps, show_help)

            cv2.imshow("AI Virtual Mouse", img)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                break
            elif key == ord('p'):
                ctrl.toggle_pause()
            elif key in (ord('+'), ord('=')):
                cfg.smooth_factor = min(cfg.smooth_factor + 1, 15)
            elif key in (ord('-'), ord('_')):
                cfg.smooth_factor = max(cfg.smooth_factor - 1, 1)
            elif key == ord('h'):
                show_help = not show_help
    except Exception as e:  # pyautogui.FailSafeException ham shu yerga tushadi
        if type(e).__name__ == "FailSafeException":
            print("Sichqoncha ekran burchagiga olib borildi, dastur to'xtatildi.")
        else:
            raise
    finally:
        ctrl.release_all()
        tracker.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
