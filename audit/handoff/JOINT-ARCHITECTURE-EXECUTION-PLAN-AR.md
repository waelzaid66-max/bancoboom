# خطة تنفيذ معمارية مشتركة — Cursor × Claude (اتفاق ملزم)

**آمر الجودة والتسليم:** Cursor (مسؤول عن جودة مسارَي الوكيلين معاً)  
**المالك:** يعتمد الدمج والموجات · يسحب Replit  
**التاريخ:** 2026-07-19  
**قاعدة:** ترتيب معماري سليم · لا انحراف · لا خلط فلاتر · صدق كامل · فحص مزدوج

---

## 0) الاتفاق المقترح (Claude يوقّع بملف ACK)

| بند | نص الاتفاق |
|-----|------------|
| A1 | الترتيب: **W0 → W1 → W2 → W3 → W4…** بلا قفز |
| A2 | W1 = Cursor فقط (فصل Discover عن Search) — **CI أخضر على PR #32** |
| A3 | W2 = دمج #28 (Cursor) + مراجعة عقد Claude قبل/بعد الدمج |
| A4 | W3 = Claude فقط بعد الجملة الحرفية `Start W3` · قاعدة = `main` بعد W2 |
| A5 | ملفات محرّمة للتصادم بلا إعلان: `FinancingService.ts` · `banks.tsx` · `onboarding.tsx` · `schemas.ts` · `SearchDiscover.tsx` |
| A6 | أي إخفاق يُكتب في `audit/handoff/` · ممنوع تجميل أو كذب |
| A7 | لا مسح ميزات · أيقونات SVG فقط |

**توقيع Claude المطلوب:** ملف  
`audit/handoff/CLAUDE-ACK-JOINT-ARCHITECTURE-AR.md`  
يبدأ بـ: `أوافق على JOINT-ARCHITECTURE A1–A7` أو اعتراض بند بند بدليل.

---

## 1) الحالة الحالية (حقائق — فحص الآن)

| موجة | الحالة | دليل |
|------|--------|------|
| الحقائق / TASK-001 | ✅ Claude سلّم `48142ad` · Cursor فحص مرتين | PR #31 |
| TASK-002 | ✅ Claude @ `b72b1c3` — ACK A1–A7 + مراجعة #32 + مواصفات W3 | فرع `claude/handoff-full-facts-20260719` |
| W1 عزل الأقسام | ✅ **MERGED** #32 | main |
| W0 Replit | ⏳ على جهاز المالك | `git pull origin main` + شوتات |
| W2 #28 | ✅ **MERGED** (fi-separation P0) | main عبر merge |
| W3 FI أمان | ✅ **MERGED #40** — Claude اعتمد β (`7f6f3ec`) · لا إعادة تنفيذ | `628e7a0` على main |
| تشطيب أقسام | ✅ **MERGED #41** · حارس 46/46 | `dad3a59` |
| صيانة Claude M-1/M-2 | ▶️ `cursor/claude-compose-m1m2-4322` | مرآة `propertyType` في search-contract |

---

## 2) التاسكات المتوازية الآن (بالترتيب المعماري)

```
[Owner] W0 Replit pull ────────────────────────────┐
                                                    │ لا يوقف W1
[Cursor] TASK-C-W1-CLOSE — جودة #32 + جاهزية دمج ──┤
                                                    │
[Claude] TASK-002 — مراجعة معمارية لـ #32           │
         + مواصفات قبول W3 (مستند فقط)             │
         + ACK الاتفاق A1–A7                        │
                                                    ▼
              المالك يعتمد دمج W1 (#32)
                                                    ▼
              Cursor يجهّز W2 checklist (#28) — بلا دمج عشوائي
                                                    ▼
              بعد W2 على main: Start W3 → Claude ينفّذ أمان FI
```

**ممنوع:** Claude يفتح فرع كود FI الآن · Cursor يلمس FinancingService · خلط W4 شكل مع W1.

---

## 3) تعريف «تسليم عالي» (مسؤول Cursor)

لكل تاسك قبل إعلان الإغلاق:
1. دليل ملف/commit  
2. اختبار أو CI أخضر حيث ينطبق  
3. قائمة «لم نلمسه» صادقة  
4. مراجعة الطرف الآخر إن لمس ملفاً مشتركاً  
5. لا ادّعاء إغلاق بند «لم يُتحقق»

---

## 4) روابط

| مورد | رابط/مسار |
|------|-----------|
| قناة الحقائق | PR #31 · `cursor/master-gated-plan-4322` |
| W1 كود | PR #32 · `cursor/w1-section-filter-isolation-4322` |
| FI P0 | PR #28 |
| تقسيم القدرات | `CAPABILITY-SPLIT-AND-HONESTY-PROTOCOL-AR.md` |
| TASK-002 Claude | `CLAUDE-TASK-002-REVIEW-W1-AND-W3-SPEC-AR.md` |
| TASK Cursor | `CURSOR-TASK-W1-CLOSE-AND-QUALITY-AR.md` |

— Cursor · قائد تنسيق الجودة
