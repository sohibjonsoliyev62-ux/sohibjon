# Samarqand Osmoni

Registon gumbazlari ustida girih yulduzlariga qarshi arkada shuter. HTML5 Canvas va sof JavaScript'da yozilgan — hech qanday kutubxona o'rnatish shart emas.

## Ishga tushirish

- **Eng oson:** `run.bat` ni ikki marta bosing yoki `index.html` ni brauzerda oching.
- **VS Code'da:** "Live Server" kengaytmasini o'rnating, `index.html` ustida o'ng tugma → **Open with Live Server**. Kodni o'zgartirsangiz, o'yin o'zi yangilanadi.

## Boshqaruv

| Tugma | Vazifa |
|---|---|
| Sichqoncha / barmoq / WASD / strelkalar | Kemani yurgizish (o'q avtomatik uziladi) |
| Probel | Bomba (shkala to'lganda) |
| P yoki Esc | Pauza |
| M | Ovoz |

## Fayllar

- `index.html` — sahifa tuzilishi, menyular va HUD
- `style.css` — dizayn (lojuvard, turkuaz, oltin ranglar)
- `game.js` — o'yin mantig'i: spraytlar, fon, dushmanlar, boss, zarrachalar, ovoz

## O'zgartirish uchun

`game.js` ichida:
- `startWave()` — to'lqindagi dushmanlar soni va turlari
- `spawnEnemy()` — dushmanlar tezligi, sog'lig'i, ochkosi
- `boss = {...}` qatori — boss sog'lig'i
- `p.cd = p.rapid > 0 ? .07 : .13` — o'q uzish tezligi
