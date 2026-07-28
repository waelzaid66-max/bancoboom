# إيصال Cursor — ملفات Claude الثلاثة + تصحيح مسار Stay

**من:** Cursor · **إلى:** المالك  
**التاريخ:** 2026-07-19  
**فرع Claude:** `claude/handoff-full-facts-20260719` (`48142ad`)  
**فرع التسليم:** `cursor/section-g2-finish-4322` / PR #41

---

## 1) الملفات الثلاثة المستلمة (كاملة)

| # | ملف | SHA | دور |
|---|-----|-----|-----|
| 1 | `CLAUDE-RESPONSE-FULL-FACTS-AR.md` | `c21d355` | حقائق FI/melt/تقسيم عمل |
| 2 | `CLAUDE-MASTER-FEATURE-LIFECYCLE-SHEET-AR.md` | `69f56c4` | دورات حياة · منفّذ/متبقٍ/غلط |
| 3 | `CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md` | `48142ad` | PROFILE · MINIAPP-RESET · NO-WIPE |

+ فرع جانبي مفيد: `claude/w4-mobile-align` (`2f7e24f`) — نقل sort إلى شريط 34px (Section فقط).

---

## 2) ماذا نأخذ لتقليل عبء فرع التسليم

| من Claude | حكم Cursor | فعل |
|-----------|------------|-----|
| C1 `browseSection` شبه-ميت + CI | ✅ | **مغلق أصلاً** على حارس PR #41 |
| Profile `coverActions` → `end:16` | ✅ | **مغلق** على main/#33 |
| §MINIAPP-RESET: dirty + confirm Alert | ⚠️ **قديم** | على #41 صار **ريست أوتوماتيك باك** (Stay+Section) — لا ديالوج |
| W4 sort في الشريط لكل قسم | ✅ مفيد | Section عنده · **Stay كان ناقص** → يُكمَّل في هذه الدفعة |
| #23 هيدر Stay أسود `StaysHomeHeader` | ❌ **مرفوض Owner** | MUST-KEEP = هيرو وردي · الحارس يمنع `StaysHomeHeader` |
| W3 أمان FI | ⏸ | لا تنفيذ بلا `Start W3` · Owner اعتبر FI drift سابقاً |
| NO-WIPE تعهد | ✅ | نحترمه لأي موجة لاحقة |

---

## 3) طبقات Stay بعد التصحيح (موضوع + شكل)

```
S1 Rose hero (B-OOM STAY · Where to?) — ليس أسود
S2 Type strip: sort 34px · أنواع · مطلوب
S3 Market matrix
S4 Rental strip (= FilterSheet.rentalTerm)
S5 StayCard (photo-first · B reaction · focus=booking)
S6 Map (?map=1) · FilterSheet (أنواع Stay فقط)
EXIT: باك/سوايپ/هاردوير → clearAll تلقائي
```

---

## 4) قطعة هذه الدفعة (منفّذة · حارس 40/40)

1. Stay: شريحة ترتيب 34×34 في شريط الأنواع (`stays-sort-cycle`) — نفس عقد Section/W4 Claude.  
2. StayCard: `start`/`end` بدل left/right الفيزيائي للبادجات (نفس درس Claude على coverActions).  
3. حارس: اختباران جديدان · **40/40 PASS**.  
4. إيصال + تحديث Replit-record (تسجيل فقط).

— Cursor · استلام دقيق · لا انتظار Claude للموجة التالية على Stay · لا W3 بلا Start
