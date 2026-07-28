# G0 — محاذاة الحقيقة البصرية (بعد دمج #39)

**وضع الكود على main:** PR **#39** مدمج عند `0696c66`  
**حارس:** **35/35** على فرع `#40` (بعد #39 كان 33/33)  
**موجة كود:** `cursor/fi-authz-agent-patch-4322` — F-SEC-01/03/05/07 + R2 + F-UX-03 + صدق fiSuccess

---

## 1) الحقيقة الثابتة لـ Replit (انسخها)

| بند | قيمة |
|-----|------|
| الفرع المطلوب للتصوير | `origin/main` |
| Tip أدنى مقبول | `0696c66` أو أحدث |
| PR المدمج | **#39** — https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/39 |
| حارس على main@#39 | 33/33 · على فرع #40: 35/35 |

```bash
git fetch origin
git checkout main
git reset --hard origin/main
git rev-parse --short HEAD   # ≥ 0696c66
node artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs
```

---

## 2) شوتات G0 الإلزامية فقط

| # | السطح | ماذا يجب أن يظهر | ❌ فشل إن |
|---|--------|-------------------|-----------|
| G0-1 | Discover | كروت 2×2 صور · بوابة Stay · Banks أزرق · **لا** صفوف ENTER · **لا** CategoryTabs فوق Discover | ENTER / melt |
| G0-2 | قسم سيارات (مثال) | هيدر: back+عنوان+search+filter **داخل** الشريط · chips بلا فراغ أسود · نتائج/فارغ صادق | أزرار خارجة · void أسود |
| G0-3 | Stay / Booking | هيرو **وردي** · ليس أسود | هيدر أسود |
| G0-4 | Banks زائر/غير عضو | subtitle صادق · productsHint · Join ظاهر · **لا** chevron تنقّل | ادّعاء دليل شركاء |
| G0-5 | Banks عضو FI (إن متاح) | inbox ظاهر · **Join مختفي** | Join فوق الـ inbox |
| G0-6 | Profile اختيار FI | بعد اختيار مؤسسة → onboarding بـ نشاط بنك فقط (`intent=fi`) | مسار تاجر/إعلان |
| G0-7 | Profile حساب FI قائم | كارت «مؤسسة مالية» → يفتح Banks · **ليس** «أضف إعلان» كأساسي | كارت تاجر |

ارفع الشوتات + جدول ✅/❌ في  
`audit/handoff/REPLIT-G0-DELIVERY-AR.md` على فرع `replit/…-4322` أو تعليق على PR AuthZ.

**Replit = تصوير وتأكيد فقط — ممنوع تعديل كود لإخفاء عيب.**

---

## 3) ترتيب بعد G0 + #39

1. Owner يعتمد شوتات G0 على `main` (أو يسجّل فروقاً حقيقية فقط).  
2. دمج PR AuthZ (F-SEC-01 / R2 / صدق fiSuccess) بعد مراجعة.  
3. بعدها فقط: قرار Banks ب/ج · أو Verify→link · أو تشطيب قسم مسمّى إن ظهر عيب في الشوت.

---

## 4) ما لن يُفتح بلا Start صريح

- دليل بنوك حي (D1=ج)  
- redesign Discover/Stay  
- Verify تلقائي يفتح inbox  
- موجة pad عشوائية على كل الشاشات  

---

## 5) جملة Owner

- «G0 OK» = الشوتات على main مقبينة  
- «ادمج AuthZ» / متابعة بعد مراجعة PR  
أو  
- «G0 فشل في: … (رقم الشوت)»  
