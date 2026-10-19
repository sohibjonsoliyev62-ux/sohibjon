# Qum Jangi

Standoff uslubidagi 3D birinchi shaxs otishma (FPS). Brauzerda ishlaydi, **Three.js** (3D grafika kutubxonasi) asosida yozilgan.

## Ishga tushirish

- `run.bat` ni ikki marta bosing (yoki `index.html` ni Chrome / Edge'da oching).
- VS Code'da: **Live Server** kengaytmasini o'rnating → `index.html` ustida o'ng tugma → **Open with Live Server**.
- Birinchi ishga tushirishda internet kerak (Three.js va shriftlar CDN'dan yuklanadi).

## O'yin

- 5 ga 5 jamoaviy jang: siz + 3 ta bot (Ko'k) va 5 ta bot (Qizil).
- 30 ta o'ldirishga birinchi yetgan yoki 5 daqiqada ko'proq o'ldirgan jamoa yutadi.
- Halok bo'lsangiz, 3 soniyadan keyin o'z bazangizda qayta tug'ilasiz.
- Xarita: "Buxoro bozori" — gumbazli markaziy bino, minoralar, konteynerlar, yashiklar va bozor rastalari.

## Boshqaruv

| Tugma | Vazifa |
|---|---|
| W A S D | Yurish |
| Sichqoncha | Qarash |
| Chap tugma | Otish |
| O'ng tugma | Nishonga olish / snayper optikasi |
| R | Qayta o'qlash |
| 1 2 3 yoki g'ildirak | Avtomat / To'pponcha / Snayper |
| Shift | Sekin yurish (aniqroq otish) |
| Probel | Sakrash |
| Tab | Hisob jadvali |
| Esc | Pauza |

Boshga tekkan o'q 2.5 barobar ko'proq zarar beradi. Yugurib yoki sakrab otganda o'qlar tarqab ketadi.

## Fayllar

- `index.html` — sahifa, HUD va menyular
- `style.css` — interfeys dizayni
- `game.js` — butun o'yin: xarita, grafika, fizika, botlar sun'iy intellekti, qurollar, ovozlar

## Sozlash (`game.js` boshida)

- `CFG.killsToWin` — g'alaba uchun o'ldirishlar soni
- `CFG.matchTime` — o'yin vaqti (soniya)
- `CFG.botsPerTeam` — jamoalardagi botlar soni
- `WEAPONS` — qurollarning zarari, tezligi, o'q soni, tepkisi
- `botShoot()` ichidagi `chance` — botlarning aniqligi (qiyinlik)
