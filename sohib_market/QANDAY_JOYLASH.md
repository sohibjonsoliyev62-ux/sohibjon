# Sohib Market'ni internetga joylash

Papkada `index.html` fayli bor — bu to'liq ishlaydigan sayt. Hech qanday
server yoki dastur kerak emas, oddiy brauzerda ham ochiladi.

## Eng oson yo'l — Netlify Drop (bepul, 1 daqiqa)
1. Brauzerda **https://app.netlify.com/drop** ni oching.
2. Shu `sohib_market` papkasini (yoki `index.html` faylni) sahifaga
   **sudrab tashlang** (drag & drop).
3. Netlify sizga darhol manzil beradi, masalan `https://sohib-market.netlify.app`.
   Shu havolani istalgan odamga yuborsangiz bo'ladi.
4. (Ixtiyoriy) Ro'yxatdan o'tsangiz, saytni saqlab qo'yasiz va bepul
   `.netlify.app` manzilini o'zgartira olasiz.

## Boshqa bepul variantlar
- **GitHub Pages (allaqachon sozlangan):** repozitoriyda Settings → Pages →
  Branch: `main`, papka `/ (root)` → Save. Sayt manzili:
  https://sohibjonsoliyev62-ux.github.io/sohibjon/sohib_market/
- **Vercel:** vercel.com ga papkani yuklang.
- **O'z domeningiz** (masalan `sohibmarket.uz`): domen sotib olib, shu
  hostinglardan biriga ulaysiz.

## Muhim: AI chat haqida
Bu faylda chatdagi sun'iy intellekt **oddiy rejimda** ishlaydi — kalit
so'zlarga qarab katalogdan transport tavsiya qiladi (byudjet, "mototsikl",
"elektr", "oilaviy" kabi so'zlarni tushunadi).

To'liq, erkin suhbatlashadigan AI (claude.ai dagi kabi) ishlashi uchun
alohida server va API kaliti kerak. Buni keyin qo'shishda yordam beraman.

Agar AI to'liq ishlashini istasangiz — hozircha eng oson yo'li: sahifani
claude.ai dagi **Share** tugmasi orqali ommaviy qilib ulashish.
