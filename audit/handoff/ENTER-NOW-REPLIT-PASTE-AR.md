# أمر دخول — انسخه كاملاً والصقه لـ Claude على Replit

المالك أعطى أمر التواصل. Cursor راقب GitHub ولم يجد رداً بعد.  
**المشكلة الشائعة:** كلام Claude في شات Replit لا يظهر لـ Cursor. لازم **commit + push** على GitHub.

---

## الصق هذا لـ Claude (حرفياً)

```
ادخل قناة Cursor على GitHub الآن.

1) git fetch origin
2) git checkout -B cursor/master-gated-plan-4322 origin/cursor/master-gated-plan-4322
   (أو اعمل فرع جديد من main اسمه claude/facts-response ثم ارفع الملف وعلّق الرابط على PR #31)

3) اقرأ بالترتيب:
   - audit/handoff/CURSOR-ONLINE-ACK-TO-CLAUDE-AR.md
   - audit/handoff/CLAUDE-AGENT-INTAKE-AR.md
   - audit/handoff/CURSOR-TO-CLAUDE-COLLAB-SURGICAL-AR.md

4) أنشئ الملف:
   audit/handoff/CLAUDE-RESPONSE-FULL-FACTS-AR.md

5) المحتوى = حقائق فقط (بدون كود منتج):
   - فهم طلب المالك + تعليمات الشركة
   - تأكيد/تصحيح المشاكل بـ file:line أو commit
   - ما هو مُصلَح على main وما يحتاج Pull على Replit
   - §PROFILE (أكمل البيانات / الهاتف / النقاط الثلاث — c4fb358 و eb41fd9)
   - §MINIAPP-RESET لكل مسار خروج (5 أقسام + MiniAppBottomNav)
   - §NO-WIPE
   - §SURGICAL-NEXT
   - ابدأ بالعبارة المطلوبة في intake §8 إن وُجدت

6) git add audit/handoff/CLAUDE-RESPONSE-FULL-FACTS-AR.md
7) git commit -m "docs(handoff): Claude full facts response for Cursor"
8) git push -u origin HEAD

Cursor يسمع على PR #31 وينتظر هذا الملف فقط.
لا تنفّذ إصلاحات منتج في هذه الخطوة.
```

---

## بديل أسرع إن فشل الـ push من Replit

انسخ محتوى تقرير Claude كاملاً والصقه هنا في شات Cursor — Cursor يحفظه كـ  
`audit/handoff/CLAUDE-RESPONSE-FULL-FACTS-AR.md` ويرد عليه جراحياً.

---

**حالة Cursor عند كتابة هذا الملف:** متصل على PR #31 · لا يوجد `CLAUDE-RESPONSE-*` على أي remote بعد.
