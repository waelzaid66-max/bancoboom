# جرد صفحة × صفحة — هيدر · أزرار · مساحات سودا · Search/أقسام

**تاريخ:** 2026-07-19  
**هدف الموجة:** إصلاح الصفحات والـ Search **قسم قسم · صفحة صفحة · ميلي · زر · حرف**  
**قاعدة Owner:** الهيدر كان كويس — لما اتصغّر باظ وخرجت الأزرار منه.  
**مرجع قياس:** `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md`  
**MUST-KEEP:** `INVESTIGATION-AND-REPAIR-PLAN-AR.md`  
**خطة التنفيذ الممنهجة:** `SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md` (وحدات A/B/C/D)

---

## أ) درس الهيدر (مثبت بالكود + شهادة Owner)

| حدث | SHA | ماذا حصل |
|-----|-----|----------|
| إصلاح crush/void | `55e9ffe` | topPad حقيقي · `hScroll.flexGrow:0` · backBtn 8 · header padBottom 10 |
| **تصغير خاطئ** | `b539108` | `iconBtn` **12→8** بحجة crowding → الأزرار تطلع من شريط الهيدر |
| **إصلاح هذه الموجة** | tip الحالي | إرجاع `iconBtn:12` · `paddingHorizontal:16` · `flexShrink:0` على الأزرار · `minWidth:0` على العنوان |

**قانون ثابت:** العنوان ينكمش · الأزرار لا تُصغَّر ولا تُضغط خارج الهيدر.

---

## ب) طابور الإصلاح (ترتيب صارم)

### موجة 1 — Search + أقسام (الآن / جارٍ)

| # | السطح | ملف | هيدر | void أسود | أزرار داخل الهيدر | حالة |
|---|-------|-----|------|-----------|-------------------|------|
| 1 | Search Discover/Host | `app/(tabs)/search.tsx` | topPad حقيقي · iconBtn **12** · H16 | hScroll 0 | ✅ مرجع | جرد — لا redesign |
| 2 | Section (car/RE/fac/mat) | `SectionSearchApp.tsx` | كان iconBtn 8 / H12 | hScroll 0 ✅ | كان ❌ بعد التصغير | ✅ **أُصلح** (12 + shrink0 + H16) |
| 3 | Stay / Booking | `BookingStaysApp.tsx` | rose hero · أزرار 36×36 | hScroll 0 ✅ | flexShrink 0 على back/actions | ✅ **تثبيت** |
| 4 | Country picker trigger | `MarketCountryPicker.tsx` | — | — | علم+اسم | ✅ موجود |
| 5 | Discover cards | `SearchDiscover.tsx` | لا هيدر قسم | — | كروت 118 | جرد بصري لاحقاً |

### موجة 2 — بعد شوتات موجة 1 (ملف بملف · topPad 67)

| # | السطح | ملف | عيب معروف | إصلاح مسموح |
|---|-------|-----|-----------|-------------|
| 6 | Profile | `profile.tsx` | `web ? 67` | topPad حقيقي فقط |
| 7 | Banks | `banks.tsx` | `web ? 67` | نفس |
| 8 | Onboarding | `onboarding.tsx` | `web ? 67` | نفس |
| 9 | Wallet / Plans / Invoices | `wallet` `plans` `invoices*` | `web ? 67` | نفس |
| 10 | RFQ / Rentals / Bookings | `rfq*` `rentals/hub` `bookings` | `web ? 67` + أزرار 32×32 | topPad · hit إن لزم |
| 11 | Business hub screens | supply/investments/… | `web ? 67` | نفس |
| 12 | Listings create/edit/mine | `listings*` | `web ? 67` | نفس |
| 13 | Listing detail | `listing/[id].tsx` | offset 67 | نفس |

> موجة 2 **لا تبدأ** قبل: شوتات موجة 1 PASS على هيدر الأقسام + لا void أسود تحت الهيدر.

### موجة 3 — حرف/نص فقط عند الإثبات

| # | السطح | ملاحظة |
|---|-------|--------|
| 14 | Legal Terms/Privacy | MOB-08 AR إن ناقص |
| 15 | Banks copy | honesty موجودة — لا دليل شركاء حي بدون Start |

---

## ج) قائمة فحص تحت الهيدر (كل قسم — بعد ركوب الهيدر)

لكل من car · real-estate · factories · materials · booking:

```
[ ] 1. صف الهيدر: back + عنوان + search + filter — كلها داخل الشريط
[ ] 2. لا زر مقطوع / خارج الحدود / فوق الشيبس
[ ] 3. بعد الهيدر مباشرة: شريط chips — بلا فراغ أسود عملاق
[ ] 4. hScroll لا يبتلع النتائج
[ ] 5. country = علم + اسم
[ ] 6. sort chip في الشريط (W4)
[ ] 7. نتائج تظهر تحت الشريط (مش كرت واحد في القاع)
[ ] 8. map pill مضغوط إن ظهر
[ ] 9. حروف العنوان غير مكسورة وسط الزر
[ ] 10. قياس: iconBtn pad=12 · H-pad=16 · Δ≤2dp
```

---

## د) ماذا يُصلح الآن في الكود (هذه الدفعة)

1. `SectionSearchApp` — استعادة مقاس الهوست + منع خروج الأزرار  
2. `BookingStaysApp` — `flexShrink:0` / `minWidth:0` على صف الهيرو  
3. حارس جديد يمنع رجوع `iconBtn padding: 8`  
4. لا لمس Discover cards · لا لمس W3 · لا topPad موجة 2 في نفس الـ PR إلا إن الشوت يطلب

---

## هـ) أوامر قبول

```bash
node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs
# متوقع 26/26
```

Replit: شوتات أقسام بعد الهيدر (car + RE + Stay على الأقل) + جدول §ج.

— Cursor · Page inventory
