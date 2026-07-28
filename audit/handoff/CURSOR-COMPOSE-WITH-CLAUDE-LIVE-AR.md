# تركيب Cursor مع ردود Claude الحيّة — الآن

**من:** Cursor · **إلى:** Claude + المالك · **التاريخ:** 2026-07-19  
**الغرض:** تنسيق صادق مع مراجعة Claude الإنتاجية (`7f6f3ec`) بعد أمر المالك «اتفضل» ثم «أكمل صح مع الردود».

---

## 0) حالة القنوات (حقائق)

| قناة | tip | ملاحظة |
|------|-----|--------|
| `origin/main` | `dad3a59` | #40 (W3 FI) + #41 (G2 sections) **مدموجان** |
| `claude/handoff-full-facts-20260719` | `7f6f3ec` | مراجعة إنتاجية — لا كود منتج جديد بعد المراجعة |
| وكيل Cursor آخر على `booking-notif…` | stale | PR #7 مدموج سابقاً — **ليس** شغل Claude · لا تصادم معه |

**حكم Claude (β):** لا إعادة تنفيذ W3 — #40 كامل ومختبر 8/8.  
**Stay:** وردي MUST-KEEP حتى جملة مالك صريحة.  
**دليل بنوك حي:** معلّق ADS-FIRST / D1=ج.

---

## 1) ما نُفِّذ بعد المراجعة (تسلسل الدمج الذي طلبه Claude)

| ترتيب Claude | PR | حالة main |
|-------------:|----|-----------|
| 1 W1 | #32 | ✅ مدموج سابقاً |
| 2 fi-authz W3 | #40 → `628e7a0` | ✅ مدموج بعد «اتفضل» |
| 3 section-g2 | #41 → `dad3a59` | ✅ مدموج |
| 4 mob01/04/05 + w4 | سبق | ✅ على main |

---

## 2) ملاحظات الصيانة Claude §2 — إغلاق جراحي

| # | طلب Claude | حالة Cursor الآن |
|---|------------|------------------|
| M-1 | مرّر `propertyType` إلى `lib/search-contract` | ✅ `types` + `buildSearchParams` + `url` parse + `CLEAR` + facet latch |
| M-2 | احذف cast `property_type` في الموبايل | ✅ `sp.property_type = …` مباشرة (النوع من الـschema) |
| M-3 | assert `/section/booking` | ✅ موجود مسبقاً في الحارس |
| M-4 | مراجعة أوسع `search.tsx` | ⏸ مؤجّل · غير حاجز دمج |

فرع هذا التركيب: `cursor/claude-compose-m1m2-4322`.

---

## 3) رسالة لـClaude (ماذا تفعل / لا تفعل)

1. **لا تعِد W3** على `FinancingService` — main فيه التنفيذ المعتمد.  
2. إن كتبت handoff جديد: ادفع على `claude/handoff-full-facts-20260719` — Cursor يلتقطه.  
3. Stay أسود / دليل بنوك حي: **ممنوع** بلا جملة مالك.  
4. بعد سحب هذا الـPR: حدّث tip Claude إن لزم ACK فقط (مستند).

---

## 4) Replit (Ops)

```bash
git pull origin main   # ≥ dad3a59 ؛ وبعد دمج compose ≥ tip الجديد
# Reload Expo — تأكيد بصري فقط
```

— Cursor · تركيب مع Claude الحي بلا تصادم
