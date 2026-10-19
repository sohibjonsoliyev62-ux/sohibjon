import math
import random
from turtle import *

# =====================================================
#   "Jannat hidi kelgan Rayhonim Onam"  -  torli rasm
#   (daftardagi rasm asosida: yurak, poya, barglar,
#    atirgul g'unchasi va qiya yozuv - hammasi iplardan)
# =====================================================

setup(1000, 850)
title("Onajonim")
bgcolor("black")
colormode(255)
speed(0)
hideturtle()
tracer(4, 0)            # kattaroq son = tezroq chiziladi
pensize(1)
random.seed(7)


def chiziq_boshla(x, y):
    penup()
    goto(x, y)
    pendown()


def aralash(r1, r2, k):
    k = max(0.0, min(1.0, k))
    return tuple(int(a + (b - a) * k) for a, b in zip(r1, r2))


# ================= YURAK (torli) =================
S = 17  # yurak kattaligi


def heart(k):
    return 15 * math.sin(k) ** 3


def heart1(k):
    return 12 * math.cos(k) - 5 * math.cos(2 * k) - 2 * math.cos(3 * k) - math.cos(4 * k)


def yurak_chiz(n=6000, tepa=(255, 45, 75), past=(175, 0, 20)):
    chiziq_boshla(heart(0) * S, heart1(0) * S)
    oldingi = heart1(0)
    for i in range(n):
        y = heart1(i)
        color(aralash(tepa, past, (11 - (y + oldingi) / 2) / 27))
        goto(heart(i) * S, y * S)
        oldingi = y
    penup()


# ================= EGRI CHIZIQ (poya uchun) =================
def egri(nuqtalar, har_biri=30):
    """Berilgan nuqtalar orqali silliq egri chiziq (Catmull-Rom)."""
    p = [nuqtalar[0]] + nuqtalar + [nuqtalar[-1]]
    natija = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for j in range(har_biri):
            t = j / har_biri
            natija.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
                       + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3)
                for k in (0, 1)))
    natija.append(nuqtalar[-1])
    return natija


def ipli_lenta(yol, eni0, eni1, qadam=6, ranglar=((20, 120, 40), (60, 170, 70))):
    """Yo'l bo'ylab ikki chet orasiga zigzag qilib ip tortadi."""
    m = len(yol)

    def chet(i, tomon):
        a, b = yol[max(i - 1, 0)], yol[min(i + 1, m - 1)]
        d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        nx, ny = -(b[1] - a[1]) / d, (b[0] - a[0]) / d
        eni = eni0 + (eni1 - eni0) * i / (m - 1)
        return yol[i][0] + tomon * eni * nx, yol[i][1] + tomon * eni * ny

    for tomon, rang in zip((1, -1), ranglar):
        color(rang)
        chiziq_boshla(*chet(0, tomon))
        for i in range(m - qadam):
            goto(*chet(i, tomon))
            goto(*chet(i + qadam, -tomon))
        penup()


# ================= BARG (keng, yumaloq, uchli - torli) =================
def barg(x, y, burchak_daraja, uzunlik=90, eni=70, n=330, qadam=2.85,
         och=(130, 235, 110), toq=(20, 115, 40)):
    a = math.radians(burchak_daraja)
    ca, sa = math.cos(a), math.sin(a)

    def joy(lx, ly):
        return x + lx * ca - ly * sa, y + lx * sa + ly * ca

    def shakl(s):
        # asosi yumaloq, o'rtasi keng, uchi o'tkir
        return 2.2 * s ** 0.55 * (1 - s) ** 0.75 / 0.9

    def nuqta(t):
        s = (1 - math.cos(t)) / 2
        return joy(uzunlik * s, eni / 2 * math.sin(t) * shakl(s))

    chiziq_boshla(*nuqta(0))
    for i in range(n):
        t = i * qadam
        color(aralash(toq, och, (1 - math.cos(t)) / 2))
        goto(*nuqta(t))
    penup()
    color(toq)
    chiziq_boshla(*nuqta(0))
    for i in range(1, 61):
        goto(*nuqta(2 * math.pi * i / 60))
    penup()
    # o'rta tomir va yon tomirchalar (rasmdagi chiziqchalar)
    for _ in range(3):
        d = random.uniform(-1.5, 1.5)
        chiziq_boshla(*joy(0, d))
        goto(*joy(uzunlik * 0.92, -d))
    for k in (0.28, 0.45, 0.62, 0.78):
        for tomon in (1, -1):
            for _ in range(2):
                d = random.uniform(-1, 1)
                chiziq_boshla(*joy(uzunlik * k + d, tomon * 4))
                goto(*joy(uzunlik * (k + 0.1) + d, tomon * eni * 0.32 * shakl(k)))
    penup()


# ================= ATIRGUL (daftardagi rasmdagidek) =================
# Shakllar rasmdan olingan (koordinatalar rasm bo'yicha, pastdagi uchi = poya ulanadigan joy)
ATIRGUL_PAST = (290, 515)
CHAP_GULBARG = [(290, 515), (150, 330), (300, 190)]                       # ichi bo'sh gulbarg
TANA = [(290, 515), (300, 190), (330, 75), (450, 62), (560, 140),         # bo'yalgan gulbarg
        (615, 290), (600, 380), (530, 402), (450, 425)]                    # va dumaloq gul boshi
TESHIK = [(350, 288), (352, 398), (455, 385)]                             # ichidagi bo'sh uchburchak


def _perimetr(nuqtalar):
    """Yopiq ko'pburchak chetidan p (0..1) bo'yicha nuqta qaytaruvchi funksiya."""
    yopiq = nuqtalar + [nuqtalar[0]]
    uz = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(yopiq, yopiq[1:])]
    jami = sum(uz)

    def nuqta(p):
        q = (p % 1.0) * jami
        for (a, b), l in zip(zip(yopiq, yopiq[1:]), uz):
            if q <= l:
                f = q / l if l else 0
                return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
            q -= l
        return yopiq[-1]
    return nuqta


def atirgul(ox, oy, k=0.44):
    def joy(p):
        return ox + (p[0] - ATIRGUL_PAST[0]) * k, oy - (p[1] - ATIRGUL_PAST[1]) * k

    def tori(shakl, n, qadam, rang1, rang2, yumaloq=False):
        nuqtalar = [joy(p) for p in shakl]
        if yumaloq:
            nuqtalar = egri(nuqtalar + [nuqtalar[0]], 8)[:-1]
        chet = _perimetr(nuqtalar)
        chiziq_boshla(*chet(0))
        p = 0.0
        for i in range(n):
            # har xil uzunlikdagi iplar shaklni to'liq to'ldiradi
            p += qadam + random.uniform(-0.18, 0.18)
            color(aralash(rang1, rang2, 0.5 + 0.5 * math.sin(p * 2 * math.pi)))
            goto(*chet(p))
        penup()

    # 1) bo'yalgan gulbarg va gul boshi - zich iplar
    tori(TANA, 1600, 0.5, (90, 0, 22), (165, 5, 42), yumaloq=True)
    # 2) ichidagi bo'sh uchburchak (qora iplar bilan "ochiladi")
    tori(TESHIK, 400, 0.5, (0, 0, 0), (0, 0, 0))
    # 3) chegaralar - qalin qizil ip bog'lamlari
    color((175, 15, 48))
    yopiq = lambda sh: [joy(p) for p in sh] + [joy(sh[0])]
    ipli_chiziq(yopiq(CHAP_GULBARG), eni=3.2, iplar=10)
    tana = [joy(p) for p in TANA]
    ipli_chiziq(egri(tana + [tana[0]], 8), eni=3.2, iplar=10)
    ipli_chiziq(yopiq(TESHIK), eni=2.2, iplar=7)
    # chap gulbarg ichiga siyrak iplar (bo'sh ko'rinishi saqlanadi)
    tori(CHAP_GULBARG, 45, 0.5, (110, 0, 28), (150, 5, 40))


# ================= YOZUV (iplar bilan, qiya) =================
def _aylana(cx, cy, rx, ry, a0, a1, n=12):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


HARFLAR = {
    "A": [[(0, 0), (2, 6), (4, 0)], [(0.8, 2.4), (3.2, 2.4)]],
    "N": [[(0, 0), (0, 6), (4, 0), (4, 6)]],
    "T": [[(0, 6), (4, 6)], [(2, 6), (2, 0)]],
    "H": [[(0, 0), (0, 6)], [(4, 0), (4, 6)], [(0, 3), (4, 3)]],
    "I": [[(2, 0), (2, 6)], [(1, 6), (3, 6)], [(1, 0), (3, 0)]],
    "D": [[(0, 0), (0, 6), (1.6, 6)] + _aylana(1.6, 3, 2.4, 3, 90, -90) + [(0, 0)]],
    "K": [[(0, 0), (0, 6)], [(4, 6), (0, 2.4)], [(1.4, 3.6), (4, 0)]],
    "E": [[(4, 6), (0, 6), (0, 0), (4, 0)], [(0, 3), (3, 3)]],
    "L": [[(0, 6), (0, 0), (4, 0)]],
    "G": [_aylana(2, 3, 2, 3, 40, 340, 16) + [(4, 2.6), (2.3, 2.6)]],
    "R": [[(0, 0), (0, 6), (2.5, 6)] + _aylana(2.5, 4.5, 1.5, 1.5, 90, -90, 8) + [(0, 3)],
          [(1.8, 3), (4, 0)]],
    "Y": [[(0, 6), (2, 3), (4, 6)], [(2, 3), (2, 0)]],
    "O": [_aylana(2, 3, 2, 3, 0, 360, 24)],
    "M": [[(0, 0), (0, 6), (2, 3), (4, 6), (4, 0)]],
    "J": [[(1, 6), (4, 6)], [(3.2, 6), (3.2, 1.6)] + _aylana(1.6, 1.6, 1.6, 1.6, 0, -180, 8)],
}


def ipli_chiziq(nuqtalar, eni, iplar):
    uzun = [0.0]
    for (x1, y1), (x2, y2) in zip(nuqtalar, nuqtalar[1:]):
        uzun.append(uzun[-1] + math.hypot(x2 - x1, y2 - y1))
    jami = uzun[-1] or 1
    for _ in range(iplar):
        a, b = random.uniform(-eni, eni), random.uniform(-eni, eni)
        for j, (px, py) in enumerate(nuqtalar):
            k = j if j < len(nuqtalar) - 1 else j - 1
            (x1, y1), (x2, y2) = nuqtalar[k], nuqtalar[k + 1]
            d = math.hypot(x2 - x1, y2 - y1) or 1
            nx, ny = -(y2 - y1) / d, (x2 - x1) / d
            o = a + (b - a) * uzun[j] / jami
            if j == 0:
                chiziq_boshla(px + nx * o, py + ny * o)
            else:
                goto(px + nx * o, py + ny * o)
        penup()


QIYALIK = -32  # yozuv qiyaligi (daraja), rasmdagidek pastga-o'ngga


def matn_yoz(matn, cx, cy, u, dx=0, dy=0, iplar=14):
    a = math.radians(QIYALIK)
    ca, sa = math.cos(a), math.sin(a)
    harf_eni, oraliq = 4 * u, 1.6 * u
    kenglik = len(matn) * harf_eni + (len(matn) - 1) * oraliq
    x0 = -kenglik / 2
    for harf in matn:
        for chiziq in HARFLAR.get(harf, []):
            nuqtalar = []
            for px, py in chiziq:
                lx, ly = x0 + px * u, py * u - 3 * u
                nuqtalar.append((cx + dx + lx * ca - ly * sa, cy + dy + lx * sa + ly * ca))
            ipli_chiziq(nuqtalar, eni=u * 0.8, iplar=iplar)
        x0 += harf_eni + oraliq


QATORLAR = [("JANNAT HIDI", 43, 26, 4.0),
            ("KELGAN", 15, -18, 4.5),
            ("RAYHONIM", -13, -64, 5.0),
            ("ONAM", -48, -120, 7.0)]


def yozuv():
    color((110, 20, 50))                 # soya
    for matn, x, y, u in QATORLAR:
        matn_yoz(matn, x, y, u, dx=3, dy=-3, iplar=6)
    color("white")                       # asosiy yozuv - oppoq
    for matn, x, y, u in QATORLAR:
        matn_yoz(matn, x, y, u)


# ================= CHIZISH TARTIBI =================
yurak_chiz()

# asosiy poya: pastki chapdan yurak ostidan o'tib, o'ng tomondan atirgulga
asosiy = egri([(-345, -150), (-215, -172), (-60, -215), (105, -178),
               (222, -65), (258, 25), (255, 95), (238, 150)])
ipli_lenta(asosiy, 10, 5)
# tepadagi kichik shoxcha (barglar to'pi uchun)
shox = egri([(257, 70), (215, 130), (165, 165)], 20)
ipli_lenta(shox, 5, 3, qadam=4)

# barglar: (x, y, yo'nalish burchagi, uzunlik, eni)
for bx, by, burchak, uz, en in [
        (-265, -162, 128, 80, 66),     # chapdagi barglar
        (-170, -182, 78, 85, 70),
        (-55, -214, -72, 105, 85),     # pastdagi katta barg
        (222, -65, -18, 100, 80),      # o'ngdagi katta barg
        (258, 30, 160, 70, 56),
        (165, 165, 168, 78, 62),       # tepadagi barglar to'pi
        (165, 165, 108, 68, 54)]:
    barg(bx, by, burchak, uz, en)

atirgul(238, 150)
yozuv()

update()
done()
