# Face ID — yuzni real vaqtda tanish

Kameraga qaragan odamning ism-familiyasini ekranda ko'rsatadigan dastur.

## Muhim
Dastur faqat **siz oldindan qo'shgan** odamlarni taniydi. Notanish odamning
yuzidan kimligini aniqlay olmaydi — buning uchun uni avval bir marta
tanishtirish kerak (telefondagi Face ID kabi).

## Ishga tushirish
`face_id` papkasida:

- `run_face_id.bat` — oddiy tanish rejimi
- `run_himoya.bat` — himoya rejimi (notanish yuz yoki egasi ketsa kompyuter qulflanadi)

Yoki terminalda:
```
python face_id.py
```
Birinchi marta ikkita model fayli (~39 MB) avtomatik yuklanadi — internet kerak.

## Odam qo'shish (2 yo'l)

**1. Kamera orqali:** dastur ochiq turganda **R** tugmasini bosing, terminalga
ism-familiyani yozing (lotin harflarida) va 3 soniya kameraga qarab, boshingizni
sekin u yoq-bu yoqqa burang. Shu zahoti sizni tanib, ismingizni yashil ramkada
ko'rsatadi.

**2. Rasmlardan:** `face_id\odamlar\` ichida har bir odam uchun ismi bilan papka
oching va 3–5 ta aniq yuz rasmini soling:
```
odamlar\Ali Valiyev\1.jpg
odamlar\Ali Valiyev\2.jpg
odamlar\Vali Aliyev\rasm.png
```
Dastur keyingi ishga tushganda bu rasmlardan o'zi o'rganadi.

## Tugmalar (kamera oynasida)
- `r` — yangi odam qo'shish
- `l` — himoya rejimini yoqish/o'chirish
- `q` yoki `Esc` — chiqish

## Buyruqlar
```
python face_id.py --list            ro'yxatdagi odamlar
python face_id.py --delete "Ism"    odamni o'chirish
python face_id.py --add "Ism"       ochilishi bilan shu odamni yozib olish
python face_id.py --lock            himoya rejimi
python face_id.py --lock --away 30  egasi 30s ko'rinmasa qulflash (0 = o'chiq)
python face_id.py --camera 1        boshqa kamera
```

## Fayllar
- `faces_db.npz` — o'rganilgan yuzlar bazasi
- `jurnal.csv` — kim qachon kelgani (Excel'da ochsa bo'ladi)
- `notanishlar\` — notanish yuzlarning rasmlari
- `odamlar\` — rasmlardan o'rgatish uchun papka
- `models\` — yuklab olingan modellar

## Aniqlik yaxshi bo'lishi uchun
- Yuz yorug' bo'lsin, kamera ro'parasida turing.
- Ro'yxatga olayotganda boshni biroz buring — turli burchaklar yozilsin.
- Bir odamni turli sharoitda (ko'zoynakli/ko'zoynaksiz) qo'shsangiz, yaxshiroq taniydi.
