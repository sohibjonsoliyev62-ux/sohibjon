# Sohibjon Soliyev — loyihalar

| Loyiha | Tavsif | Texnologiya |
|---|---|---|
| [AI Virtual Mouse](#ai-virtual-mouse) | Qo'l harakati bilan sichqonchani boshqarish | Python, OpenCV, MediaPipe |
| [Face ID](face_id/) | Yuzni real vaqtda tanish va kompyuterni himoyalash | Python, OpenCV |
| [Qum Jangi](qum_jangi/) | Brauzerda 3D FPS o'yin | JavaScript, Three.js |
| [Samarqand Osmoni](samarqand_osmoni/) | Arkada shuter o'yin | JavaScript, Canvas |
| [Sohib Market](sohib_market/) | Internet-do'kon sayti | HTML, CSS, JavaScript |

---

# AI Virtual Mouse

Veb-kamera va qo'l harakatlari orqali kompyuter sichqonchasini boshqaruvchi dastur.
Qo'l nuqtalari **MediaPipe Hands** bilan aniqlanadi, sichqoncha **PyAutoGUI** orqali boshqariladi.

## O'rnatish va ishga tushirish

Eng oson yo'l: papkadagi **run.bat** faylini ikki marta bosing — kerakli kutubxonalarni o'rnatadi va dasturni ishga tushiradi.

Qo'lda:

```bash
pip install -r requirements.txt
python main.py
```

Talablar: Windows, Python 3.9–3.12, veb-kamera.

## Imo-ishoralar

| Imo-ishora | Amal |
|---|---|
| Ko'rsatkich barmoq tik | Kursorni yurgizish |
| Bosh + ko'rsatkich barmoqni qisib qo'yib yuborish | Chap klik |
| Tez ikki marta qisish | Ikki marta klik |
| Qisib ushlab turish (0.35 s dan ko'p) va qo'lni surish | Sudrab olib borish (drag & drop) |
| Bosh + o'rta barmoqni qisish | O'ng klik |
| Ko'rsatkich + o'rta barmoq tik ("V") va qo'lni yuqoriga/pastga surish | Skroll |
| Musht | To'xtash (kursor joyida qoladi) |

Kursor faqat kamera oynasidagi pushti ramka ichida harakatlanadi — ramka butun ekranga moslanadi.

## Klaviatura (kamera oynasi faol bo'lganda)

| Tugma | Vazifa |
|---|---|
| `q` yoki `Esc` | Chiqish |
| `p` | Pauza yoqish/o'chirish (ramka qizil bo'ladi) |
| `+` / `-` | Kursor silliqligini oshirish/kamaytirish |
| `h` | Yordam panelini ko'rsatish/yashirish |

**Favqulodda to'xtatish:** sichqonchani ekranning istalgan burchagiga olib boring.

## Parametrlar

```bash
python main.py --camera 1 --smooth 7 --margin 0.2 --scroll 3
```

- `--camera` — kamera raqami (noutbukda odatda 0, tashqi kamera 1)
- `--smooth` — kursor silliqligi, 1–15 (kattaroq = silliqroq, lekin sekinroq)
- `--margin` — kadr chetidan tashlab yuboriladigan hudud ulushi (0–0.4)
- `--scroll` — skroll tezligi

## Tuzilishi

- `Config` — barcha sozlamalar bir joyda
- `GestureController` — imo-ishoralarni sichqoncha amallariga aylantiruvchi mantiq (kamera va PyAutoGUI'dan mustaqil, shuning uchun alohida test qilish mumkin)
- `PyAutoGuiMouse` — sichqonchani boshqaruvchi adapter
- `draw_hud` — ekrandagi FPS, rejim va yordam paneli
- `main_eski.py` — loyihaning oldingi versiyasi

## Muammolar

- **"Kamera ochilmadi"** — boshqa dastur (Zoom, Telegram) kamerani band qilmaganini tekshiring yoki `--camera 1` bilan ishga tushiring.
- **Kursor titraydi** — `+` tugmasi bilan silliqlikni oshiring, xonada yorug'lik yetarli bo'lsin.
- **Klik o'zi bosilib ketadi** — qo'lni kameradan biroz uzoqroq tuting.
- **`mediapipe` o'rnatilmayapti** — Python 3.13 hali qo'llab-quvvatlanmaydi, Python 3.12 dan foydalaning.
