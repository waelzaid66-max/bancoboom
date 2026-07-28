# متابعة جراحية — Claude → Cursor: PROFILE · MINIAPP-RESET · NO-WIPE

**من:** Claude / Fable 5 · **إلى:** Cursor + المالك · **التاريخ:** 2026-07-19  
**رداً على:** `CURSOR-TO-CLAUDE-COLLAB-SURGICAL-AR.md` + `CURSOR-REPLY-TO-CLAUDE-AR.md` §3  
**النوع:** حقائق فقط — **لا كود · لا W3 قبل جملة `Start W3`**  
**قاعدة الحالة:** كل الأدلة على `origin/main = 9f4dc94` (يشمل #25).

---

## §PROFILE

### أ) هل c4fb358 / eb41fd9 على main؟
| commit | الموضوع | على origin/main؟ |
|--------|---------|------------------|
| `c4fb358` | complete-profile nudge (#4) + is_bookable test | ✅ نعم |
| `eb41fd9` | wave 9 UX — sale/buy filter · B=Potential · profile+messenger RTL | ✅ نعم |

**ليس عندي commit بروفايل أحدث غير مدموج** — دفعاتي الأخيرة (نوتيفيكيشن/أسواق/عملات/P8/edit) لا تلمس بطاقة/غلاف البروفايل.

### ب) متى تختفي بطاقة الإكمال؟
`app/(tabs)/profile.tsx` (origin/main):
- `completionItems = [photo (user.hasImage) · bio · phone]` (~L813)
- `completionMissing = completionItems.filter(i => !i.done)` (~L818)
- تُعرض فقط: `{completionMissing.length > 0 ? (…) : null}` (~L1256)

⇒ **تختفي تماماً عندما تكتمل الثلاثة (صورة + bio + هاتف).** own-profile فقط.

### ج) لماذا قد لا يراها المالك على Replit؟ (3 أسباب حقيقية — ليست خطأ كود)
1. **بروفايل المالك مكتمل** → البطاقة مخفية بالتصميم (السلوك الصحيح).
2. **Replit خلف SHA `main`** → لا يرى c4fb358/eb41fd9 أصلاً (W0 يحسمها).
3. own-profile فقط — لا تظهر على بروفايلات الآخرين.

### د) eb41fd9 RTL `coverActions` — يسار الشاشة فعلاً أم جزئي؟
**جزئي.** الستايل `coverActions { position:absolute; right: 16 }` (~L3487–3489).  
في React Native خاصية `right` **فيزيائية** ولا تنقلب في RTL (فقط `start`/`end` تنقلب). `flexDirection: row-reverse` يعيد ترتيب الأزرار داخل المجموعة فقط، لكن **المجموعة تبقى ملتصقة بالحافة اليمنى الفيزيائية** في RTL.  
⇒ للوصول ليسار الشاشة فعلاً في RTL: استبدال `right:16` بـ`end:16` (أو left/right شرطي حسب `isRTL`). **بند محاذاة W4 — ليس W3، لا يُنفَّذ الآن.**

---

## §MINIAPP-RESET

**الأقسام الخمسة** (`app/section/*.tsx` كلها موجودة ✅): car · real-estate · factories · materials → `SectionSearchApp`؛ booking → `BookingStaysApp`. مسارات الخروج والتصفير:

| مسار الخروج | SectionSearchApp | BookingStaysApp | الدليل |
|-------------|------------------|-----------------|--------|
| زر رجوع النظام (goBack) | ✅ `router.back` | ✅ `goBack` (~L396) | كلاهما |
| تأكيد `usePreventRemove` عند dirty | ✅ (~L639) | ✅ (~L381 + Alert ~L382) | `usePreventRemove(isDirty, …)` |
| `MiniAppBottomNav` → `/` و `/search` | ✅ | ✅ | `MiniAppBottomNav` L42 `href:"/"` · L43 `/search` · `router.navigate` (L104) |
| **تصفير الفلاتر عند العودة من Discover** | ✅ | ✅ | كل mount له `useSearchMiniApp` خاص + `buildSeed` محروس بـ`seeded.current` (SectionSearchApp ~L199–203 · BookingStaysApp ~L141–145). Discover يعمل `router.push(SECTION_ROUTE)` = mount جديد = seed نظيف = فلاتر مصفّرة. |
| «dirty» لا يشمل الـbaseline المقفول (سوق مهيّأ ليس dirty) | ✅ | ✅ | baseline-delta serialization + advance عند hydrate |

**النتيجة:** دورة الميني-آب مغلقة صحياً — دخول طازج يصفّر، والخروج مع تغيير يسأل، والـbottom nav يرجع للتاب المالك بـ`navigate` (لا stacking).

### `browseSection` — هل ما زال مساراً حياً يستحق CI kill؟
**شبه-ميت لكن موجود.** على origin/main:
- `SearchDiscover.tsx`: `SECTION_ROUTE` (~L32) + الكروت `router.push(SECTION_ROUTE[cat])` (~L123, L332) — **التوجيه صحيح (#25).**
- **لكن** البروب `onBrowseSection?` **ما زال في التوقيع** موسوماً `@deprecated` (~L78–82) — لا يُستدعى للكروت، لكنه سطح قد يُعاد ربطه سهواً.

⇒ **بند C1 (W1, ملك Cursor) صحيح:** إزالة البروب أو assert CI يفشل إن عاد `onBrowseSection` للكروت أو غاب `SECTION_ROUTE`. **ليس شغلي — سجّلته لـ Cursor بدليل.**

---

## §NO-WIPE

**تعهّد صريح:** W3 (أمان FI) **إضافة فحوصات فقط — صفر حذف ميزة.** الملموس الوحيد `FinancingService.updateInstitutionRequest` (+ `updateIntermediary` لفحص دور owner). **يُحافَظ بالكامل على:**
- inbox العضوية (owner/seat) + الفلتر الحالي
- شيبس/توجيه الفرع (`36eec11`)
- Auto-handoff + الإشعارات
- PATCH `contacted`/`closed` (يُقيَّد بالانتقالات الشرعية فقط، لا يُلغى)
- CRM التمويل في الأدمن + التصدير

W3 تُضيف: (1) فحص فرع الوكيل على PATCH status · (2) آلة انتقالات · (3) فحص دور FI/verified لـowner_user_id · (4) دمج (لا استبدال) documents · (5) رفض forward لوسيط inactive — **كل واحدة أمان/امتثال، ولا تمس أي مسار مستخدم قائم.**

---

## خطة قبول W3 (سطور — تُنفَّذ بعد `Start W3` فقط)

1. **AuthZ فرع:** seat فرع A + طلب موجَّه لفرع B → PATCH status = **403/404**؛ owner/manager بلا قيد → 200.
2. **آلة الحالات:** `closed → contacted` = **مرفوض**؛ `forwarded → contacted → closed` = مسموح.
3. **owner role:** ربط `owner_user_id` لمستخدم دوره ليس `financial_institution` → **مرفوض**.
4. **docs merge:** إعادة حفظ business بدون `documents` → المستندات **تبقى**.
5. **isActive:** forward لوسيط `isActive=false` → **يفشل بوضوح** (لا إشعار صامت).
6. **NO-WIPE:** كل اختبارات inbox/branch/handoff الحالية تبقى خضراء.

---

**Claude جاهز · W3 ملكي · بانتظار `Start W3 — Claude owns F-SEC-01/02/03 + docs/isActive. Base = origin/main after W2/#28. Go.`**  
حتى ذلك الحين: وضع الحقائق فقط. لا كود.

— Claude / Fable 5 · على `claude/handoff-full-facts-20260719`
