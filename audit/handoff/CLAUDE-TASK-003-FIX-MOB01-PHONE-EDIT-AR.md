# TASK-003 لـ Claude — إصلاح جراحي وحيد: MOB-01 هاتف في تعديل الملف

**مُصدِر:** Cursor (جودة مشتركة)  
**قاعدة الكود:** ابدأ من `origin/main` (أو فرعك محدَّث به) — **ملف واحد تقريباً**  
**ممنوع:** W3 · FinancingService · SearchDiscover · Banks · إعادة تصميم Profile · أي «تحسينات» جانبية

---

## العيب (حقيقة مثبتة)

1. `completionItems` لـ phone يستدعي `openEditProfile` — `artifacts/banco-mobile/app/(tabs)/profile.tsx:816`  
2. `openEditProfile` (`375–387`) يجهّز title/category/bio فقط  
3. مودال التعديل (`1867+`) لا يعرض حقل هاتف  
4. `saveProfile` (`389–410`) يحفظ Clerk `unsafeMetadata` فقط — **لا** `updateMe({ phone })`  
5. مسار التسجيل الصحيح موجود مسبقاً: `updateMe({ phone })` عند `238–241` — **أعد استخدامه**، لا تخترع API

---

## التنفيذ المطلوب (صغير مرتّب)

1. أضف حالة مسودة هاتف منفصلة عن هاتف نموذج التسجيل إن لزم (مثلاً `phoneDraft`) حتى لا تخلط signup/edit.  
2. في `openEditProfile`: املأ المسودة من `meQuery.data?.data?.phone ?? ""`.  
3. في مودال التعديل: حقل `TextInput` / `AppTextInput` بهاتف (`keyboardType="phone-pad"`) + مفاتيح i18n موجودة (`profile.phonePlaceholder` / أضف مفتاح label إن نقص — **en+ar**).  
4. في `saveProfile`: بعد نجاح metadata (أو معه بشكل آمن):
   - `await updateMe({ phone: phoneDraft.trim() })` (أو احذف الهاتف فقط إن كان العقد يسمح — لا تخمّن؛ إن اختياري اترك فارغاً كما signup).  
   - أعد جلب/إبطال `useGetMe` حتى يختفي الـ nudge.  
5. أبقِ باقي الحقول والسلوك كما هي (NO-WIPE).  
6. `testID` مقترح: `edit-phone-input`.

### اختبارات إلزامية قبل الدفع

```bash
pnpm --filter @workspace/banco-mobile exec tsc --noEmit   # أو typecheck الجذر إن كان المسار المعتمد
# إن توفّر:
pnpm run typecheck
```

في الدليل اكتب إن لم تشغّل جهازاً: `DEVICE: not run`.

---

## مخرجات الريبو

```bash
git fetch origin
git checkout -B claude/mob01-phone-edit-4322 origin/main   # أو اسم فرعك بنمط واضح
# … تعديل profile (+ i18n إن لزم)
git add artifacts/banco-mobile/app/\(tabs\)/profile.tsx \
        artifacts/banco-mobile/constants/i18n.ts \
        audit/handoff/CLAUDE-TEST-EVIDENCE-TASK003.md
git commit -m "fix(mobile): MOB-01 phone field in edit profile modal"
git push -u origin HEAD
```

علّق على PR #31: `TASK-003 delivered @ <sha> — MOB-01`  
افتح PR صغير ضد `main` إن طلب سير العمل ذلك — **لا تخلطه مع W3**.

---

## قبول Cursor

- [ ] شريحة الهاتف تفتح مودالاً فيه حقل هاتف  
- [ ] الحفظ يمرّ عبر `updateMe`  
- [ ] الـ nudge يعكس الحالة بعد الحفظ (أو توثيق محدّث لـ invalidate)  
- [ ] صفر تغيير خارج النطاق  
- [ ] دليل اختبار صريح

**قبل TASK-003 إن TASK-002 غير مُسلَّم:** سلّم ملفات TASK-002 أولاً في نفس الجلسة أو مباشرة قبل هذا الإصلاح.

— Cursor
