# مصفوفة شوتات Replit — كاملة · مرتّبة · صفحة/قسم/ميزة/حقل

**أمر Cursor لـ Replit:** صوّر **كل** بند بالترتيب أدناه. لا تتخطَّ P0. ارفع الشوتات + جدول ✅/❌ في  
`audit/handoff/REPLIT-SHOTS-DELIVERY-AR.md` على فرع `replit/w0-shots-4322` أو علّق على PR #31.

**قاعدة الكود:** بعد السحب `origin/main` ≥ `f69d51e` (يشمل MOB-01). إن دُمج MOB-05 لاحقاً أعد شوتات Discover+Banks.

**قواعد تصوير**
1. جهاز/Expo واحد · لغة **AR ثم EN** للبنود P0 فقط (أو العكس ثابت في التقرير).  
2. اسم الملف: `S###-short-slug.png` مطابقاً لعمود Order.  
3. لكل شوت: اكتب في التقرير الحقول الظاهرة / المكسورة / الناقصة.  
4. **ويب معزول:** قسم W في النهاية — `banco-website` فقط — لا تلم الموبايل.  
5. ممنوع Start W3 · ممنوع تعديل كود لإخفاء عيب — سجّل العيب.

---

## A) Auth / Profile

| Order | السطح | ماذا تصوّر | حقول/عناصر إلزامية في الإطار |
|------:|-------|------------|-------------------------------|
| S001 | Profile signed-out | بوابة الدخول | إيميل · باسورد · Sign in/up · Google/Apple · Terms/Privacy |
| S002 | Account type chooser | بعد أول دخول | Individual / Dealer / Company / FI |
| S003 | Profile signed-in | الهوية | غلاف · أفاتار · عنوان · فئة · نبذة · إحصائيات · روابط |
| S004 | Complete-profile nudge | إن ناقص | شرائح photo/bio/**phone** |
| S005 | Edit profile modal | بعد S004 أو القائمة | عنوان · فئة · نبذة · **هاتف** · حفظ (`edit-phone-input`) |
| S006 | Social links modal | تعديل الروابط | حقول المنصات · حفظ |
| S007 | Profile ⋯ menu | القائمة | Listings · Hub · Trips · Wallet · Plans · Verify · Settings · Help · Sign out |
| S008 | Profile grid | منشورات | بطاقات + CTA إنشاء |
| S009 | Photo rationale | عند تغيير صورة | عنوان/نص/تأكيد |

## B) Tabs الرئيسية

| Order | السطح | ماذا تصوّر | حقول/عناصر |
|------:|-------|------------|------------|
| S010 | Home feed | `(tabs)/index` | لوغو · ترتيب · مساعد · جرس · قضبان For You/Deals · كروت |
| S011 | Home logo menu | مودال اللوغو | الوجهات |
| S012 | Tab bar + FAB | كبسولة | Feed/Search/Messages/Saved/Profile + Post |
| S013 | Search Discover | استعلام فارغ | بطاقات أقسام · Booking · Supply · Banks · map (إن ظاهر) · **بدون CategoryTabs** |
| S014 | Search results | بعد بحث/فئة | إدخال · CategoryTabs · engines · فلتر · قائمة |
| S015 | Filter sheet | من Search | sort · market · category · brands · سعر · موقع · Apply |
| S016 | Search map | وضع خريطة | دبابيس + عودة للقائمة |
| S017 | Messages inbox | قائمة محادثات | unread · empty إن لزم |
| S018 | Chat thread | محادثة | composer · إرفاق · عرض سعر إن وُجد |
| S019 | Saved | محفوظات | searches + listings |
| S020 | Notifications | تنبيهات | قائمة · mark all |

## C) أقسام Mini-apps (كل قسم كامل)

لكل من: **car · real-estate · factories · materials · booking** كرّر السلسلة:

| لاحقة | ماذا | حقول |
|------|------|------|
| S02x-a | دخول من Discover | هيدر 3 عناصر + شريط فلاتر (sort chip بعد السوق) |
| S02x-b | فلاتر/engines | chips القسم |
| S02x-c | نتائج | كروت |
| S02x-d | خريطة القسم | إن وُجدت |
| S02x-e | Filter sheet | خاص بالقسم |
| S02x-f | MiniAppBottomNav | رجوع تبويب رئيسي |
| S02x-g | Dirty exit | إن غيّرت فلتر ورجعت — حوار التأكيد |

أرقام مقترحة: Cars **S021–S027** · RE **S028–S034** · Factories **S035–S041** · Materials **S042–S048** · Booking/Stay **S049–S055**.

## D) Business / Banks / B2B

| Order | السطح | حقول إلزامية |
|------:|-------|--------------|
| S056 | Banks hub | عنوان · subtitle **صادق** · أنواع منتجات **بلا chevron** · Join CTA · note |
| S057 | Banks inbox | إن حساب FI — قائمة طلبات · Contacted/Close · فرع |
| S058 | Business onboarding | نوع نشاط · أسماء · مدينة · هاتف · مستندات · Submit |
| S059 | Verification | حالة · تفاصيل |
| S060 | Supply hub | بطاقات Industry/Investments/Suppliers/… |
| S061–S070 | Industry · Investments list/create/detail · Suppliers · Company public/edit · Global supply list/create · Market · Analytics | الحقول الظاهرة لكل شاشة |
| S071 | Customer leads `business/requests` | Call/WhatsApp/status |
| S072 | RFQ inbox مورّد | عروض |
| S073–S075 | Buyer RFQ list/create/detail | عنوان · فئة · ميزانية · عروض |

## E) Listings

| Order | السطح | حقول |
|------:|-------|------|
| S076–S079 | Create wizard steps 1–4 | فئة · تفاصيل/مواصفات/هواتف · ميديا/سعر/خطط · معاينة/نشر |
| S080 | Location/Car pickers | مودالات |
| S081 | My listings | حالات · Edit/Renew/Delete |
| S082 | Edit listing | مسودة محمّلة |
| S083 | Listing detail | معرض · سعر · بائع · تواصل · تمويل/حجز إن وُجد |
| S084 | Rentals hub | وحدات/طلبات |
| S085 | Bookings/Trips | تأكيد/رفض/إلغاء |

## F) Legal · Wallet · Settings · Other

| Order | السطح | حقول |
|------:|-------|------|
| S086–S087 | Terms · Privacy | محتوى (لاحظ إن إنجليزي فقط = عيب MOB-08) |
| S088–S091 | Billing · Wallet · Plans · Invoices | رصيد · شحن · باقات · فواتير |
| S092 | Settings | إشعارات · لغة · ثيم · أمان · حذف حساب |
| S093 | Assistant | اقتراحات · دردشة |
| S094 | 404 | not-found |

## W) Website — عزل تام (`banco-website` :3000)

| Order | المسار | ملاحظة |
|------:|--------|--------|
| W001 | `/` | هوم |
| W002–W005 | `/cars` `/real-estate` `/industrial` `/directory` | أقسام ويب |
| W006 | `/search` | بحث ويب |
| W007 | `/listing/[id]` | تفصيلة |
| W008 | `/saved` | |
| W009–W010 | sign-in / sign-up | |
| W011+ | `/workspace/*` | listings · leads · bookings · wallet · messages · analytics · b2b |

**ميثاق:** `WEBSITE-ABSOLUTE-ISOLATION-CHARTER-AR.md` — صفر تعديل موبايل من أجل الشوت.

---

## تقرير التسليم (إلزامي)

```markdown
# REPLIT-SHOTS-DELIVERY-AR
HEAD: <sha>
Lang: ar|en
Expo URL: …
Website URL: …

| Order | File | Status OK/BUG | Bug note (file:line إن عرف) |
|-------|------|---------------|------------------------------|
| S001  | …    | OK            |                              |
```

أول سطر تعليق على PR #31:  
`Replit shots · HEAD=<sha> · matrix FULL-ORDERED · delivery file pushed`

— Cursor
