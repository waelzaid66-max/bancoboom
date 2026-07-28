# من دمّر ماذا — واسترجاع Discover (2026-07-19)

## الحكم المباشر

| سؤال | جواب |
|------|------|
| مين غيّر كروت البحث الرئيسية؟ | **Cursor Agent** (`cursoragent@cursor.com`) |
| أي كوميت؟ | `6ba5f1b` — `fix(mobile): Discover enter portals + compact BOOM STAY header` |
| ماذا فعل؟ | استبدل شبكة كروت الأقسام **2×2 صور سينمائية** بصفوف **ENTER** أفقية (`sectionList` / `sectionPortal`) |
| هل `main` اتدمّر؟ | **لا** — `main @ 88e83ca` ما زال يحمل التصميم الصحيح |
| مين استرجع؟ | Cursor Agent على `6b18408` — `fix(mobile): restore Discover 2x2 photo section cards from main` |
| tip الحالي | **`6b18408`** على `cursor/discover-enter-fix-4322` (PR #37) |

## سلسلة الضرر (وكلاء)

| كوميت | وكيل | أثر |
|-------|------|-----|
| `6ba5f1b` | Cursor Agent | **جذر استبدال كروت Discover بكروت ENTER** |
| لاحقاً على نفس الفرع | Cursor Agent | إصلاحات فراغ أسود / زر دول / خريطة (مفيدة) فوق التصميم الخاطئ |
| `6b18408` | Cursor Agent | **استرجاع شبكة الكروت من main** + بقاء العزل والـ honesty |
| Replit | منفّذ فقط | لم يكتب الاستبدال ولا الاسترجاع |
| Copilot | UNTRUSTED | لا اعتماد |

## ما رُجّع فعلياً في `SearchDiscover`

- `sectionGrid` + `sectionCard` (صور + scrim + watermark) — نفس شكل main
- ضغط القسم → `SECTION_ROUTE` + `router.push` (بدون ذوبان Discover→Search)
- CTA الخريطة → عقارات فقط (`category === "real_estate"` + إحداثيات)
- `paddingBottom: 200` تحت Discover

## ما رُفض للأبد

- صفوف ENTER بدل كروت الصور
- أي ذوبان Discover→Search
- أي وكيل غير Cursor يكتب كود إنتاج

## إصلاحات بصرية مرتبطة (نفس الفرع)

| عيب من شوتات المالك | السبب | الإصلاح |
|---------------------|--------|---------|
| فراغ أسود في الأقسام | `ScrollView` أفقي يكبر العمود | `hScroll.flexGrow = 0` |
| هيدر مسحوق | `topPad` وهمي على الويب | `Math.max(insets.top, …)` |
| زر الدول «متدمّر» | علم فقط | علم + **اسم** + شيفرون |
| حبة خريطة عملاقة | مقاسات مختلفة عن Search | مطابقة مقاسات الهوست |

## حارس

`section-miniapp-guard.test.mjs` → **25/25 PASS**  
يفرض كروت Discover + هيرو Stay الوردي ويرفض ENTER و`StaysHomeHeader`.

## إثبات Replit (فوري)

```bash
git fetch && git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322
node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs  # 25/25
npx expo start --clear
```

شوت Discover يجب يُظهر **شبكة 2×2** لكروت الأقسام بالصور — ليس قائمة ENTER.

— Cursor · Forensic restore · Owner audit
