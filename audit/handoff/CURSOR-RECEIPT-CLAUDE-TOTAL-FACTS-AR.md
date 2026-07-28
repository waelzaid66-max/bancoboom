# إيصال استلام — كل ما رفعه Claude (حقائق كاملة)

**من:** Cursor (مسؤول الجودة والتسليم)  
**إلى:** المالك · Copilot · (Claude متوقف بعد آخر دفعة)  
**التاريخ:** 2026-07-19  
**قاعدة المرجع:** `origin/main = 9f4dc94` + فروع Claude أدناه

---

## 1) ما استُلم بالكامل من Claude

| # | المصدر | SHA | المحتوى | حالة الاستلام على PR #31 |
|---|--------|-----|---------|-------------------------|
| 1 | `claude/handoff-full-facts-20260719` | `c21d355` | `CLAUDE-RESPONSE-FULL-FACTS-AR.md` | ✅ موجود ومقروء |
| 2 | نفس الفرع | `69f56c4` | `CLAUDE-MASTER-FEATURE-LIFECYCLE-SHEET-AR.md` | ✅ موجود ومقروء |
| 3 | نفس الفرع | `48142ad` | `CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md` | ✅ موجود + verify سابق |
| 4 | `claude/w4-mobile-align` | `2f7e24f` | كود W4: نقل quick-sort من هيدر القسم إلى شريط الفلاتر (`SectionSearchApp.tsx` فقط) | ✅ مُراجع diff · **لا PR بعد** |

### ما **لم** يسلّمه Claude قبل التوقف

| تاسك | المطلوب | الحالة |
|------|---------|--------|
| TASK-002 | ACK A1–A7 · مراجعة W1/#32 · مواصفات قبول W3 كملفات منفصلة | ❌ غير مرفوع |
| TASK-003 | MOB-01 حقل هاتف في مودال التعديل | ❌ غير مرفوع |

⇒ **لا ننتظر Claude لإكمالهما.** نكمّل مع Copilot تحت Cursor بنفس الحقائق.

---

## 2) مراجعة Cursor لحقائق Claude (قبول / تصحيح)

### مقبول ومُثبَّت (نتبنّاه كحقيقة تشغيلية)

| بند | حكم Cursor |
|-----|------------|
| F-SEC-01/02/03 · F-CLM-02 · F-SEP-01 | ✅ مؤكد سابقاً في forensic؛ Claude يوافق بدليل |
| melt كان حقيقياً و#25 أصلحه | ✅ |
| browseSection شبه-ميت ويحتاج CI kill (W1/#32) | ✅ Cursor نفّذه؛ CI أخضر |
| coverActions `right:16` RTL جزئي | ✅ Cursor أصلح في #33 (`end:16`) |
| Profile nudge يختفي عند اكتمال الثلاثة | ✅ |
| مسار هاتف الـnudge مكسور (يفتح edit بلا هاتف) | ✅ **MOB-01** — Claude سجّل البروفايل صح لكن فاته هذا المسار الميت؛ Cursor وثّقه |
| Mini-app reset/seed/preventRemove صحية في الكود | ✅ قبول مع تحفظ: غير مثبتة على جهاز |
| NO-WIPE لتعهد W3 | ✅ نُلزم أي منفّذ لاحق (Copilot) بنفس النص |
| تكرار BoomStayHeader — اعتماد `StaysHomeHeader` (#23) | ✅ |
| «ملايين» غير مثبت حمل | ✅ صدق ملزم |
| W4 sort: نقل أيقونة من هيدر مزدحم إلى chip 34px | ✅ نطاق منضبط · ملف واحد · منطق الدورة كما هو |

### تحفظات Cursor (لا تُنكر عمل Claude — تضبط التنفيذ)

1. **TASK-002 ناقص** → Cursor يصدر مواصفات قبول W3 من follow-up Claude نفسه (موجودة في §خطة قبول W3) ويعتمدها رسمياً دون انتظار ACK ملف.  
2. **W4 على فرع بلا PR** → يجب فتح PR ومراجعة CI قبل الدمج.  
3. **Replit ≠ main** يبقى W0 — ملك Ops/Cursor توجيه + Owner سحب.  
4. **#28 غير مدمج** — بوابة قبل أي أمان FI.  
5. ادعاء Claude أن 4 أخطاء tsc في `.expo/types` لـ SearchDiscover «لـ Cursor» — يُفحص في CI (#32 أخضر)؛ لا يُفتح إصلاح وهمي.

---

## 3) خريطة المُنجَز vs المتبقي (بعد استلام Claude)

### على `main` (حي)

- FI Phase 2 API + inbox UI (Claude)  
- نوتيفيكيشن ثنائي اللغة · أسواق/عملات · ترتيب أقسام · P8 · edit market  
- Discover→sections (#25 Cursor)  
- أيقونات SVG بوابة · i18n-usage (Claude)

### في PRs / فروع (غير مدمج)

| PR/فرع | الموضوع | مالك الدمج لاحقاً |
|--------|---------|-------------------|
| #32 | W1 قطع melt + حارس CI | Cursor بعد بوابة |
| #33 | MOB-04 RTL cover | Cursor |
| #28 | FI P0 فصل تسجيل + KYC أدمن | Cursor + مراجعة عقد |
| #23 | Stay header أسود | Cursor |
| `claude/w4-mobile-align` | فك ازدحام هيدر القسم | Cursor جودة · Copilot فحص |

### فجوات مفتوحة (أولوية حقيقية)

| ID | شدة | المالك التنفيذي الآن |
|----|-----|----------------------|
| W0 Replit=SHA | P0 ops | Owner + توجيه Cursor |
| MOB-01 هاتف edit | P0 mobile | **Copilot تحت Cursor** |
| دمج #32 W1 | P0 فصل | Owner بعد تقرير Copilot مراجعة |
| دمج #28 ثم أمان FI | P0 security | بعد #28: **Copilot/Claude** تحت بوابة Start W3 |
| Banks brochure/chevron صدق | P1 | Copilot بحث + قرار Owner |
| MOB-05 CategoryTabs@Discover | P1 | Cursor بعد #32 |
| MOB-07 exploreOnMap حقن | P2 | Cursor لاحقاً |
| Scale/حمل | مؤجّل | Owner قرار |

---

## 4) رسالة لـ Claude (إغلاق قناة التنفيذ)

استلمنا كل تقاريرك + W4 (`2f7e24f`).  
أنت متوقف كما أمر المالك — **لا Start W3 منك الآن.**  
نكمل مع Copilot تحت إشراف Cursor على قاعدة الحقائق التي بنيتَها أنت.  
إذا عدت لاحقاً: اقرأ `MAINTENANCE-GOALS-TOTAL-AR.md` + أوامر الموجة الجارية فقط.

— Cursor
