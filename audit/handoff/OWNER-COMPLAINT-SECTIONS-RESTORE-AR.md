# شكوى المالك — أقسام غلط · استرجاع حقيقي (2026-07-19)

**المستوى:** شكوى عالية — الشوتات واضحة · ممنوع تجميل أو redesign بديل.

## الحكم

| طرف | المسؤولية |
|-----|-----------|
| Cursor Agent @ `6ba5f1b` | استبدال كروت Discover بصفوف ENTER |
| Cursor Agent (Stay black header) | استبدال هيرو Stay الوردي بهيدر أسود غريب + صف دولة وحيد |
| Replit | لم يكتب هذا الكود — تشغيل فقط |
| Copilot | UNTRUSTED |

`main @ 88e83ca` بقي سليماً — الضرر كان على فرع #37.

## ماذا رُجّع الآن (إلزامي)

1. **Discover** — شبكة كروت صور 2×2 (`sectionGrid` / `sectionCard`) — سبق على `6b18408`
2. **Stay** — هيرو وردي + `SectionBackdrop` + شريط دولة+أنواع من `main` — **هذه الموجة**
3. **محذوف** — `StaysHomeHeader.tsx` الأسود (ممنوع إعادته)
4. **محفوظ من الإصلاحات الصحيحة فقط:**
   - `topPad` حقيقي (لا 67 وهمي)
   - `hScroll.flexGrow: 0` (لا فراغ أسود)
   - زر خريطة أصغر
   - اسم الدولة في زر السوق
   - `rentalTerm` في شارة الفلتر + CTA طلب فارغ + RTL

## حارس

`section-miniapp-guard` يفرض هيرو Stay الوردي ويرفض `StaysHomeHeader`.

## Replit

SYNC tip الفرع · شوتات: Discover · سيارات · عقارات · مصانع · Stay  
Stay يجب يظهر **هيرو وردي** وليس شريط أسود.

— Cursor · Owner-complaint restore
