# فحص مزدوج Cursor ← تسليم Claude TASK-001 (`48142ad`)

**القاعدة:** صدق كامل · لا مجاملة · لا كذب.  
**المرجع:** `origin/main` @ `9f4dc94` + ملف Claude `CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md`

---

## PASS 1 + PASS 2 — §PROFILE

| ادّعاء Claude | نتيجة الفحص | دليل Cursor |
|---------------|-------------|-------------|
| `c4fb358` على main | ✅ PASS | `git merge-base --is-ancestor` |
| `eb41fd9` على main | ✅ PASS | نفسه |
| البطاقة تختفي عند اكتمال photo+bio+phone | ✅ PASS | `profile.tsx` completionItems ~813–818 · JSX `{completionMissing.length > 0 ? …}` ~1256 |
| الهاتف من `/me.phone` | ✅ PASS | `!!meQuery.data?.data?.phone?.trim()` ~816 |
| RTL جزئي (`right:16` فيزيائي) | ✅ PASS | `coverActions` ~3487–3489 · لا `left`/`end` شرطي |
| لا commit بروفايل أحدث غير مدموج من Claude | ✅ مقبول كإقرار منه | لا يعارضه تاريخ main الظاهر |

**إخفاق معلن (صدق):** إصلاح النقاط لليسار **ناقص** على main — يحتاج `end`/`left` في RTL (مسار Cursor W4، ليس W3).

---

## PASS 1 + PASS 2 — §MINIAPP-RESET

| ادّعاء Claude | نتيجة | دليل / تصحيح |
|---------------|--------|----------------|
| 5 شاشات section موجودة | ✅ PASS | `app/section/{car,real-estate,factories,materials,booking}.tsx` |
| `usePreventRemove` على SectionSearchApp | ✅ PASS | ~639 |
| seed مرة عند mount | ✅ PASS | `seeded` + `buildSeed` ~199–203 |
| Discover → `router.push(SECTION_ROUTE)` | ✅ PASS | `SearchDiscover.tsx` ~32 · `handleSectionPress` ~123 |
| `browseSection` شبه-ميت لكن موجود | ✅ PASS مع تشديد | البروب deprecated ~78–82 **و** `search.tsx` ما زال يمرّر `onBrowseSection={browseSection}` ~652 — سلك حي من المضيف حتى لو الكروت لا تستدعيه |
| MiniAppBottomNav = `router.navigate` | ✅ PASS | ~104 |
| «دورة مغلقة صحياً / navigate لا stacking» | ⚠️ **جزئي — لم يُحسم تجريبياً** | من الكود: `usePreventRemove` مربوط بأحداث إزالة الشاشة؛ هل `navigate` لتاب تحت الـstack يطلقه دائماً؟ **لم نُشغّل جهازاً.** الحكم الصادق: **لم يُثبت تجريبياً** · إعادة الدخول عبر Discover = remount/seed ✅ أقوى دليل تصفير |

---

## §NO-WIPE

✅ تعهد Claude لـ W3 مقبول كنطاق معلن (إضافة فحوصات فقط). Cursor يلتزم بنفس القاعدة في W1 (قطع سلك ذوبان — لا مسح ميني-آبس).

---

## قرار Cursor بعد الأخذ منه

1. **أعلن إخفاق RTL الجزئي** للمالك بصدق.  
2. **W1 Cursor الآن:** إزالة تمرير/سطح `onBrowseSection` + حارس CI على `SECTION_ROUTE` (منع خلط الفلاتر).  
3. **لا Start W3** حتى W2/#28 + أمر المالك.  
4. بند مفتوح مشترك: إثبات تجريبي لـ bottom-nav × `usePreventRemove` (لا ندّعي إنه محسوم).

— Cursor · فحص مزدوج 2026-07-19
