"""
Face ID — kamera orqali yuzni ro'yxatga olish va tanib olish.

Ishlatish:
  python face_id.py                 -> tanish rejimi
  python face_id.py --add Sohib     -> "Sohib" yuzini ro'yxatga olish, keyin tanish
  python face_id.py --list          -> ro'yxatdagi odamlar
  python face_id.py --delete Sohib  -> odamni ro'yxatdan o'chirish

  python face_id.py --lock          -> himoya rejimi (kompyuterni qulflash)
  python face_id.py --lock --away 30

Odamlarni rasmlardan qo'shish:
  odamlar\\Ali\\1.jpg, odamlar\\Ali\\2.jpg, odamlar\\Vali\\rasm.png ...
  Har bir odam uchun ismi bilan papka oching va 3-5 ta aniq yuz rasmini qo'ying.
  Dastur ishga tushganda yangi rasmlarni o'zi o'rganadi.

Jurnal (doim yoqiq):
  Kelgan har bir odam jurnal.csv ga vaqti bilan yoziladi.
  Notanish yuzlar rasmi notanishlar\\ papkasiga saqlanadi.

Himoya rejimi (--lock):
  * Kadrda faqat notanish yuz 2 soniya tursa       -> Windows qulflanadi
  * Tanish odam --away soniya ko'rinmasa (def. 15) -> Windows qulflanadi
  Qulflangandan keyin tanish yuz qaytguncha qayta qulflamaydi.
  --away 0 bilan "ketib qolsa qulflash" o'chiriladi.

Kamera oynasida:
  r  - yangi yuz qo'shish (ism konsolda so'raladi)
  l  - himoya rejimini yoqish/o'chirish
  q / Esc - chiqish

Modellar (OpenCV YuNet + SFace) birinchi ishga tushganda avtomatik yuklanadi.
"""

import argparse
import csv
import datetime
import os
import time
import urllib.request

import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DB_PATH = os.path.join(BASE_DIR, "faces_db.npz")
LOG_PATH = os.path.join(BASE_DIR, "jurnal.csv")
UNKNOWN_DIR = os.path.join(BASE_DIR, "notanishlar")

# Jurnal: odam shuncha soniya ko'rinmay turib qaytsa — yangi "keldi" yozuvi
LOG_ABSENCE = 60.0
# Notanish yuz rasmini ko'pi bilan shuncha soniyada bir saqlaymiz
UNKNOWN_SNAPSHOT_EVERY = 10.0
# Himoya: notanish yuz shuncha soniya tursa qulflanadi
LOCK_UNKNOWN_AFTER = 2.0
# Dastur ochilgandan keyingi "tinch" vaqt (darhol qulflab qo'ymaslik uchun)
LOCK_GRACE = 5.0
# Rasmlardan o'rganish: odamlar\<Ism>\*.jpg
PHOTOS_DIR = os.path.join(BASE_DIR, "odamlar")
IMPORTED_LIST = os.path.join(BASE_DIR, "odamlar_import.txt")
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

_ZOO = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/"
MODELS = {
    "detector": ("face_detection_yunet_2023mar.onnx",
                 _ZOO + "face_detection_yunet/face_detection_yunet_2023mar.onnx"),
    "recognizer": ("face_recognition_sface_2021dec.onnx",
                   _ZOO + "face_recognition_sface/face_recognition_sface_2021dec.onnx"),
}

# SFace uchun rasmiy cosine chegarasi 0.363 — shunga yaqin olamiz
MATCH_THRESHOLD = 0.36
ENROLL_SAMPLES = 20        # bitta odam uchun nechta namuna olinadi
ENROLL_INTERVAL = 0.12     # namunalar orasidagi vaqt (soniya)

# Silliqlash: oxirgi shuncha kadr natijasidan eng ko'p uchragan ism tanlanadi
# (yuz bir zum burilib ketganda "Noma'lum" ga sakrab ketmasligi uchun)
SMOOTH_FRAMES = 7
# Notanish yuz jurnalga/qulfga shu qadar soniya uzluksiz tursagina hisobga olinadi
# (egasi burilib qolganda o'zini "notanish" deb yozib qo'ymasligi uchun)
UNKNOWN_CONFIRM = 1.2


# ----------------------------------------------------------------------------
# Modellar
# ----------------------------------------------------------------------------
def ensure_model(key):
    name, url = MODELS[key]
    path = os.path.join(MODEL_DIR, name)
    if os.path.exists(path) and os.path.getsize(path) > 10_000:
        return path
    os.makedirs(MODEL_DIR, exist_ok=True)
    print(f"Model yuklab olinmoqda: {name}")
    tmp = path + ".part"
    last_err = None
    for attempt in range(1, 4):
        try:
            _download(url, tmp)
            os.replace(tmp, path)
            print("  tayyor.")
            return path
        except KeyboardInterrupt:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise SystemExit("\nYuklash bekor qilindi.")
        except Exception as e:
            last_err = e
            print(f"\n  xato ({attempt}/3): {e}")
            time.sleep(2)
    if os.path.exists(tmp):
        os.remove(tmp)
    raise SystemExit(f"Modelni yuklab bo'lmadi: {last_err}\n"
                     f"Brauzerda yuklab oling: {url}\nva shu joyga saqlang: {path}")


def _download(url, dst):
    req = urllib.request.Request(url, headers={"User-Agent": "face-id"})
    with urllib.request.urlopen(req, timeout=30) as r, open(dst, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        done, t0 = 0, time.monotonic()
        while True:
            chunk = r.read(256 * 1024)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            speed = done / max(time.monotonic() - t0, 1e-6) / 1e6
            if total:
                pct = done * 100 // total
                bar = "#" * (pct // 4) + "-" * (25 - pct // 4)
                print(f"\r  [{bar}] {pct:3d}%  {done / 1e6:5.1f}/{total / 1e6:.1f} MB"
                      f"  {speed:4.1f} MB/s", end="", flush=True)
            else:
                print(f"\r  {done / 1e6:5.1f} MB  {speed:4.1f} MB/s", end="", flush=True)
    print()
    if total and done < total:
        raise IOError(f"to'liq yuklanmadi ({done}/{total} bayt)")


class FaceEngine:
    def __init__(self, det_score=0.8):
        self.detector = cv2.FaceDetectorYN.create(
            ensure_model("detector"), "", (320, 320), det_score, 0.3, 5000)
        self.recognizer = cv2.FaceRecognizerSF.create(ensure_model("recognizer"), "")
        self._size = None

    def detect(self, img):
        h, w = img.shape[:2]
        if self._size != (w, h):
            self.detector.setInputSize((w, h))
            self._size = (w, h)
        _, faces = self.detector.detect(img)
        return [] if faces is None else list(faces)

    def embed(self, img, face):
        aligned = self.recognizer.alignCrop(img, face)
        feat = self.recognizer.feature(aligned).flatten().astype(np.float32)
        return feat / (np.linalg.norm(feat) + 1e-9)


# ----------------------------------------------------------------------------
# Yuzlar bazasi
# ----------------------------------------------------------------------------
class FaceDB:
    def __init__(self, path=DB_PATH):
        self.path = path
        self.people = {}  # ism -> (N, 128) normallashgan vektorlar
        if os.path.exists(path):
            data = np.load(path, allow_pickle=False)
            self.people = {k: data[k] for k in data.files}

    def save(self):
        # np.savez kalitlari ixtiyoriy matn bo'lishi mumkin
        tmp = self.path + ".tmp.npz"
        np.savez(tmp, **self.people)
        os.replace(tmp, self.path)

    def add(self, name, feats):
        feats = np.asarray(feats, dtype=np.float32)
        if name in self.people:
            feats = np.vstack([self.people[name], feats])
        self.people[name] = feats
        self.save()

    def delete(self, name):
        if self.people.pop(name, None) is None:
            return False
        self.save()
        return True

    def identify(self, feat):
        """(ism, o'xshashlik) — topilmasa (None, eng_yaxshi_ball)."""
        best_name, best = None, -1.0
        for name, feats in self.people.items():
            score = float(np.max(feats @ feat))
            if score > best:
                best_name, best = name, score
        if best >= MATCH_THRESHOLD:
            return best_name, best
        return None, best


# ----------------------------------------------------------------------------
# Jurnal
# ----------------------------------------------------------------------------
class Journal:
    def __init__(self, path=LOG_PATH, unknown_dir=UNKNOWN_DIR):
        self.path, self.unknown_dir = path, unknown_dir
        self.last_seen = {}      # ism -> oxirgi ko'ringan vaqt (monotonic)
        self.last_snapshot = -1e9

    def write(self, event, name, score=None, extra=""):
        new = not os.path.exists(self.path)
        # utf-8-sig — Excel'da to'g'ri ochilishi uchun
        with open(self.path, "a", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["sana_vaqt", "hodisa", "ism", "oxshashlik", "izoh"])
            w.writerow([datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), event, name,
                        "" if score is None else f"{score:.2f}", extra])

    def seen(self, names_scores, now):
        """Tanilgan odamlar: uzoq yo'qolib qaytganda 'keldi' deb yoziladi."""
        for name, score in names_scores:
            last = self.last_seen.get(name)
            if last is None or now - last >= LOG_ABSENCE:
                self.write("keldi", name, score)
                print(f"[jurnal] {name} keldi ({score:.2f})")
            self.last_seen[name] = now

    def unknown(self, img, box, now):
        if now - self.last_snapshot < UNKNOWN_SNAPSHOT_EVERY:
            return
        self.last_snapshot = now
        os.makedirs(self.unknown_dir, exist_ok=True)
        x, y, w, h = box
        H, W = img.shape[:2]
        pad = int(0.3 * max(w, h))
        crop = img[max(y - pad, 0):min(y + h + pad, H), max(x - pad, 0):min(x + w + pad, W)]
        fname = datetime.datetime.now().strftime("notanish_%Y%m%d_%H%M%S_%f")[:-3] + ".jpg"
        cv2.imwrite(os.path.join(self.unknown_dir, fname), crop if crop.size else img)
        self.write("notanish", "Noma'lum", extra=f"notanishlar/{fname}")
        print(f"[jurnal] notanish yuz -> notanishlar/{fname}")


# ----------------------------------------------------------------------------
# Himoya (Windows'ni qulflash)
# ----------------------------------------------------------------------------
def lock_workstation():
    if os.name == "nt":
        import ctypes
        return bool(ctypes.windll.user32.LockWorkStation())
    print("(Qulflash faqat Windows'da ishlaydi)")
    return False


class Guard:
    def __init__(self, away_seconds=15.0, lock_fn=lock_workstation, start=None):
        self.enabled = False
        self.away = away_seconds
        self.lock_fn = lock_fn
        now = time.monotonic() if start is None else start
        self.last_known = now
        self.unknown_since = None
        self.armed = True            # qulflangach — tanish yuz qaytguncha False
        self.grace_until = now + LOCK_GRACE

    def set_enabled(self, on, now):
        self.enabled = on
        self.last_known, self.unknown_since = now, None
        self.armed, self.grace_until = True, now + LOCK_GRACE

    def status(self, now):
        if not self.enabled:
            return "Himoya: o'chiq"
        if not self.armed:
            return "Himoya: qulflandi, egasini kutyapti"
        if self.unknown_since is not None:
            left = LOCK_UNKNOWN_AFTER - (now - self.unknown_since)
            return f"Himoya: NOTANISH! {max(left, 0):.1f}s"
        if self.away > 0:
            return f"Himoya: yoqiq ({max(self.away - (now - self.last_known), 0):.0f}s)"
        return "Himoya: yoqiq"

    def update(self, known_count, unknown_count, now):
        """Qulflash sodir bo'lsa sababini qaytaradi, aks holda None."""
        if known_count:
            self.last_known = now
            self.unknown_since = None
            self.armed = True
            return None
        if unknown_count:
            if self.unknown_since is None:
                self.unknown_since = now
        else:
            self.unknown_since = None

        if not self.enabled or not self.armed or now < self.grace_until:
            return None
        reason = None
        if self.unknown_since is not None and now - self.unknown_since >= LOCK_UNKNOWN_AFTER:
            reason = "notanish yuz"
        elif self.away > 0 and now - self.last_known >= self.away:
            reason = f"egasi {self.away:.0f}s ko'rinmadi"
        if reason:
            self.armed = False
            self.unknown_since = None
            self.lock_fn()
        return reason


# ----------------------------------------------------------------------------
# Chizish
# ----------------------------------------------------------------------------
def put_label(img, text, x, y, color):
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    y = max(y, th + 8)
    cv2.rectangle(img, (x, y - th - 8), (x + tw + 8, y), color, -1)
    cv2.putText(img, text, (x + 4, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)


def draw_bar(img, text, color=(255, 255, 255)):
    h, w = img.shape[:2]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h - 34), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, img, 0.45, 0, img)
    cv2.putText(img, text, (8, h - 11), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1)


# ----------------------------------------------------------------------------
# Dastur
# ----------------------------------------------------------------------------
def imread_unicode(path):
    """cv2.imread Windows'da kirill/maxsus belgili yo'llarni o'qiy olmaydi."""
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None


def import_photos(engine, db, photos_dir=PHOTOS_DIR, imported_list=IMPORTED_LIST):
    """odamlar\\<Ism>\\ papkalaridagi yangi rasmlardan yuzlarni o'rganadi."""
    os.makedirs(photos_dir, exist_ok=True)
    done = set()
    if os.path.exists(imported_list):
        with open(imported_list, encoding="utf-8") as f:
            done = {line.strip() for line in f if line.strip()}
    added = {}
    new_done = []
    for person in sorted(os.listdir(photos_dir)):
        pdir = os.path.join(photos_dir, person)
        if not os.path.isdir(pdir):
            continue
        for fn in sorted(os.listdir(pdir)):
            if not fn.lower().endswith(IMAGE_EXTS):
                continue
            key = f"{person}/{fn}"
            if key in done:
                continue
            new_done.append(key)
            img = imread_unicode(os.path.join(pdir, fn))
            if img is None:
                print(f"  [rasm] o'qib bo'lmadi: {key}")
                continue
            # juda katta rasmlarni kichraytiramiz (tezlik va aniqlik uchun)
            scale = 1280 / max(img.shape[:2])
            if scale < 1:
                img = cv2.resize(img, None, fx=scale, fy=scale)
            faces = engine.detect(img)
            if not faces:
                print(f"  [rasm] yuz topilmadi: {key}")
                continue
            # bir nechta yuz bo'lsa — eng kattasi shu odam deb olinadi
            face = max(faces, key=lambda f: f[2] * f[3])
            added.setdefault(person, []).append(engine.embed(img, face))
    for person, feats in added.items():
        db.add(person, feats)
        print(f"  [rasm] {person}: {len(feats)} ta rasmdan o'rganildi")
    if new_done:
        with open(imported_list, "a", encoding="utf-8") as f:
            f.write("\n".join(new_done) + "\n")
    engine._size = None  # kamera o'lchamiga qayta moslashsin
    return added


def ask_name():
    name = input("\nYangi odamning ismi (lotin harflarida, bekor qilish: Enter): ").strip()
    return name or None


def _iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


class Track:
    __slots__ = ("box", "names", "scores", "seen", "unknown_since", "logged_unknown")

    def __init__(self, box, now):
        self.box = box
        self.names = []          # oxirgi SMOOTH_FRAMES kadr: ism yoki None
        self.scores = []
        self.seen = now
        self.unknown_since = None
        self.logged_unknown = False

    def push(self, box, name, score, now):
        self.box, self.seen = box, now
        self.names.append(name)
        self.scores.append(score)
        if len(self.names) > SMOOTH_FRAMES:
            self.names.pop(0)
            self.scores.pop(0)
        # notanish holatini uzluksizligini kuzatamiz
        if self.label()[0] is None:
            if self.unknown_since is None:
                self.unknown_since = now
        else:
            self.unknown_since = None
            self.logged_unknown = False

    def label(self):
        """Silliqlangan (ism, o'xshashlik). Ko'pchilik kadrda bir ism bo'lsa — o'sha."""
        votes = {}
        for n in self.names:
            if n:
                votes[n] = votes.get(n, 0) + 1
        if votes:
            best = max(votes, key=votes.get)
            if votes[best] >= max(2, len(self.names) // 2):
                scs = [s for n, s in zip(self.names, self.scores) if n == best]
                return best, max(scs)
        return None, max(self.scores) if self.scores else 0.0

    def confirmed_unknown(self, now):
        return (self.label()[0] is None and self.unknown_since is not None
                and now - self.unknown_since >= UNKNOWN_CONFIRM)


class FaceTracker:
    """Yuzlarni kadrdan kadrga joyi bo'yicha bog'lab, ism yorlig'ini silliqlaydi."""

    def __init__(self):
        self.tracks = []

    def update(self, detections, now):
        """detections: [(box, name, score)]. Qaytaradi: [(box, name, score, track)]."""
        used = set()
        out = []
        for box, name, score in detections:
            best_t, best_i = None, 0.3
            for t in self.tracks:
                if id(t) in used:
                    continue
                v = _iou(box, t.box)
                if v > best_i:
                    best_t, best_i = t, v
            if best_t is None:
                best_t = Track(box, now)
                self.tracks.append(best_t)
            used.add(id(best_t))
            best_t.push(box, name, score, now)
            lname, lscore = best_t.label()
            out.append((box, lname, lscore, best_t))
        # eskirgan treklarni tozalaymiz
        self.tracks = [t for t in self.tracks if now - t.seen < 1.0 or id(t) in used]
        return out


def draw_top(img, text, color):
    w = img.shape[1]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 30), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, img, 0.45, 0, img)
    cv2.putText(img, text, (8, 21), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)


def run(camera, enroll_name=None, lock=False, away=15.0):
    engine = FaceEngine()
    db = FaceDB()
    journal = Journal()
    guard = Guard(away_seconds=away)
    tracker = FaceTracker()

    cap = cv2.VideoCapture(camera, cv2.CAP_DSHOW) if os.name == "nt" else cv2.VideoCapture(camera)
    if not cap.isOpened():
        raise SystemExit(f"Kamera ochilmadi (raqami: {camera}). --camera 1 bilan sinab ko'ring.")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    def set_guard(on):
        if on and not db.people:
            print("Himoyani yoqish uchun avval yuzingizni qo'shing ('r').")
            on = False
        guard.set_enabled(on, time.monotonic())
        print("Himoya rejimi:", "YOQIQ" if on else "o'chiq")

    import_photos(engine, db)
    enrolling = enroll_name
    samples, last_sample = [], 0.0
    print("Face ID ishga tushdi. r - yuz qo'shish, l - himoya, q - chiqish.")
    if db.people:
        print("Ro'yxatda:", ", ".join(db.people))
    elif not enrolling:
        print("\nBaza bo'sh: dastur hali hech kimni tanimaydi.")
        print("Avval yuzingizni bir marta ro'yxatga oling (kameraga qarab turing).")
        enrolling = ask_name()
    if lock and not enrolling:
        set_guard(True)
    pending_lock = lock and bool(enrolling)  # ro'yxatga olingach himoyani yoqamiz

    try:
        while True:
            ok, img = cap.read()
            if not ok:
                print("Kameradan tasvir olinmadi.")
                break
            img = cv2.flip(img, 1)
            faces = engine.detect(img)
            now = time.monotonic()

            if enrolling:
                if len(faces) == 1:
                    x, y, w, h = map(int, faces[0][:4])
                    cv2.rectangle(img, (x, y), (x + w, y + h), (255, 200, 0), 2)
                    if now - last_sample >= ENROLL_INTERVAL:
                        samples.append(engine.embed(img, faces[0]))
                        last_sample = now
                    msg = (f"'{enrolling}' yozilmoqda: {len(samples)}/{ENROLL_SAMPLES}"
                           " - boshingizni sekin buring")
                    draw_bar(img, msg, (0, 255, 255))
                else:
                    draw_bar(img, "Kadrda faqat BITTA yuz bo'lsin", (0, 0, 255))
                if len(samples) >= ENROLL_SAMPLES:
                    db.add(enrolling, samples)
                    journal.write("royxatga_olindi", enrolling)
                    print(f"'{enrolling}' saqlandi ({len(samples)} ta namuna).")
                    enrolling, samples = None, []
                    if pending_lock:
                        pending_lock = False
                        set_guard(True)
                    else:
                        guard.set_enabled(guard.enabled, time.monotonic())
            else:
                # 1) har bir yuzni xom aniqlaymiz
                raw = []
                for f in faces:
                    box = tuple(map(int, f[:4]))
                    name, score = (None, 0.0)
                    if db.people:
                        name, score = db.identify(engine.embed(img, f))
                    raw.append((box, name, score))

                # 2) bir necha kadr bo'yicha silliqlaymiz
                known, unknown_box = [], None
                for box, name, score, track in tracker.update(raw, now):
                    x, y, w, h = box
                    if name:
                        known.append((name, score))
                    elif track.confirmed_unknown(now):
                        unknown_box = box  # faqat tasdiqlangan notanish hisobga olinadi
                    color = (0, 170, 0) if name else (0, 0, 220)
                    label = f"{name} ({score:.2f})" if name else "Noma'lum"
                    cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
                    put_label(img, label, x, y, color)

                journal.seen(known, now)
                if unknown_box is not None:
                    journal.unknown(img, unknown_box, now)

                reason = guard.update(len(known), 1 if unknown_box else 0, now)
                if reason:
                    journal.write("qulflandi", "-", extra=reason)
                    print(f"[himoya] Kompyuter qulflandi: {reason}")

                if guard.enabled:
                    col = (0, 0, 255) if guard.unknown_since or not guard.armed else (0, 255, 0)
                    draw_top(img, guard.status(now), col)
                if not db.people:
                    draw_top(img, "Baza bo'sh - R ni bosib yuzingizni qo'shing", (0, 200, 255))
                elif unknown_box is not None and not guard.enabled:
                    draw_top(img, "Notanish yuz - tanishtirish uchun R ni bosing", (0, 200, 255))
                draw_bar(img, f"Odamlar: {len(db.people)} | r-qo'shish  l-himoya  q-chiqish")

            cv2.imshow("Face ID", img)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                break
            if key == ord('l') and not enrolling:
                set_guard(not guard.enabled)
            if key == ord('r') and not enrolling:
                name = ask_name()
                if name:
                    enrolling, samples, last_sample = name, [], 0.0
                else:  # input() paytida vaqt o'tdi — taymerlarni yangilaymiz
                    guard.set_enabled(guard.enabled, time.monotonic())
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main():
    p = argparse.ArgumentParser(description="Face ID — yuzni tanish")
    p.add_argument("--camera", type=int, default=0, help="kamera raqami (odatda 0)")
    p.add_argument("--add", metavar="ISM", help="yangi odamni ro'yxatga olish")
    p.add_argument("--list", action="store_true", help="ro'yxatni ko'rsatish")
    p.add_argument("--delete", metavar="ISM", help="odamni ro'yxatdan o'chirish")
    p.add_argument("--lock", action="store_true",
                   help="himoya: notanish yuz yoki egasi ketsa Windows'ni qulflash")
    p.add_argument("--away", type=float, default=15.0,
                   help="egasi shuncha soniya ko'rinmasa qulflash (0 = o'chiq)")
    args = p.parse_args()

    if args.list:
        db = FaceDB()
        if not db.people:
            print("Ro'yxat bo'sh.")
        for name, feats in db.people.items():
            print(f"  {name}: {len(feats)} ta namuna")
        return
    if args.delete:
        print("O'chirildi." if FaceDB().delete(args.delete) else "Bunday ism topilmadi.")
        return
    run(args.camera, args.add, lock=args.lock, away=args.away)


if __name__ == "__main__":
    main()
