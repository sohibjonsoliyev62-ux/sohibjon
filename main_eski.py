import math
import cv2
import numpy as np
import mediapipe.python.solutions.drawing_utils as mp_draw
import mediapipe.python.solutions.hands as mp_hands
import pyautogui

# Sichqonchani ekranning burchagiga olib borib dasturni favqulodda to'xtatish mumkin
pyautogui.FAILSAFE = True
# Har bir pyautogui chaqiruvidan keyingi 0.1 s kutishni o'chiramiz (aks holda sekin ishlaydi)
pyautogui.PAUSE = 0

# Ekran o'lchamlari
screen_w, screen_h = pyautogui.size()

# Kamera sozlamalari
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise SystemExit("Kamera ochilmadi.")
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# MediaPipe modeli
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
)

smooth_factor = 5
prev_x, prev_y = None, None

# Kadr chetlaridan shu ulushdagi hudud ekranning to'liq yuzasiga moslanadi
frame_margin = 0.15

# Qisish chegaralari qo'l o'lchamiga nisbatan (qo'l kameradan uzoq/yaqinligiga bog'liq emas).
# Ikki xil chegara klikning titrab qayta-qayta bosilishining oldini oladi.
pinch_on_ratio = 0.25
pinch_off_ratio = 0.35
is_pinched = False

print("Dastur ishga tushdi. To'xtatish uchun kamera oynasida 'q' bosing "
      "yoki sichqonchani ekran burchagiga olib boring.")

try:
    while True:
        success, img = cap.read()
        if not success:
            print("Kameradan tasvir olinmadi.")
            break

        img = cv2.flip(img, 1)
        cam_h, cam_w = img.shape[:2]
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_img)

        # Kursor boshqariladigan hududni ko'rsatamiz
        cv2.rectangle(
            img,
            (int(frame_margin * cam_w), int(frame_margin * cam_h)),
            (int((1 - frame_margin) * cam_w), int((1 - frame_margin) * cam_h)),
            (255, 0, 255), 2,
        )

        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_draw.draw_landmarks(img, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            landmarks = hand_landmarks.landmark

            index_finger = landmarks[8]
            thumb = landmarks[4]
            wrist = landmarks[0]
            middle_base = landmarks[9]

            x1, y1 = int(index_finger.x * cam_w), int(index_finger.y * cam_h)
            x2, y2 = int(thumb.x * cam_w), int(thumb.y * cam_h)

            distance = math.hypot(x2 - x1, y2 - y1)
            hand_size = math.hypot(
                (middle_base.x - wrist.x) * cam_w, (middle_base.y - wrist.y) * cam_h
            )
            ratio = distance / hand_size if hand_size > 0 else 1.0

            if not is_pinched and ratio < pinch_on_ratio:
                # Qisish boshlandi: faqat bir marta klik qilamiz
                is_pinched = True
                pyautogui.click()
            elif is_pinched and ratio > pinch_off_ratio:
                is_pinched = False

            if is_pinched:
                cv2.circle(img, (x1, y1), 12, (0, 255, 0), cv2.FILLED)
            else:
                # Qisish paytida kursorni qotiramiz, shunda klik mo'ljaldan siljimaydi
                raw_x = np.interp(index_finger.x, (frame_margin, 1 - frame_margin), (0, screen_w - 1))
                raw_y = np.interp(index_finger.y, (frame_margin, 1 - frame_margin), (0, screen_h - 1))

                if prev_x is None:
                    curr_x, curr_y = raw_x, raw_y
                else:
                    curr_x = prev_x + (raw_x - prev_x) / smooth_factor
                    curr_y = prev_y + (raw_y - prev_y) / smooth_factor
                prev_x, prev_y = curr_x, curr_y

                # Burchaklarga 1 piksel yetkazmaymiz, aks holda FAILSAFE o'zi ishlab ketadi
                move_x = min(max(curr_x, 1), screen_w - 2)
                move_y = min(max(curr_y, 1), screen_h - 2)
                pyautogui.moveTo(move_x, move_y)
        else:
            is_pinched = False

        cv2.imshow("AI Virtual Mouse", img)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
except pyautogui.FailSafeException:
    print("Sichqoncha ekran burchagiga olib borildi, dastur to'xtatildi.")
finally:
    hands.close()
    cap.release()
    cv2.destroyAllWindows()
