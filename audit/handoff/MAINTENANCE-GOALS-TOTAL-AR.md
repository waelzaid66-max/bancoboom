# أهداف الصيانة الكاملة — بعد استلام كل حقائق Claude

**مُعتمد من:** Cursor على أساس تقارير Claude الثلاثة + forensic Cursor + MOB package + W4  
**فلسفة ملزمة:** `release/PROJECT_CONTEXT.md` (Adaptive Marketplace · additive · لا بيانات مختلقة · SVG · i18n)  
**ترتيب موجات غير قابل للقفز:** `W0 → W1 → W2 → W3 → W4…`

---

## هدف المنتج (نجاح حقيقي — لا شعارات)

منصّة BANCO جاهزة لإطلاق مستقر عالمي: **موبايل + API + أدمن + ماركت + ويب**، بأقسام معزولة كميني-آبس، تمويل آمن، واجهات غير مضلِّلة، ونشر = `main` الحالي على Replit/GCP.

**ليس هدفاً الآن:** ادّعاء إثبات حمل «ملايين» · لغة ثالثة · إعادة بناء المنتج.

---

## أهداف الموجات (قبول / مخرج / مالك)

### W0 — Ops: الحقيقة على السيرفر
| هدف | قبول |
|-----|------|
| Replit (أو بيئة العرض) = `origin/main` الحالي | SHA منشور = SHA GitHub main بعد الدمجات المعتمدة |
| healthz / confidence خضراء حيث تنطبق | أوامر handoff تعمل |

**مالك:** Owner يسحب · Cursor يوجّه ويوثّق.

### W1 — فصل الأقسام (وقاية الذوبان) — ✅ على main
| هدف | قبول |
|-----|------|
| لا جسر Discover→Criteria Search عبر `onBrowseSection` | ✅ مدمج `#32` → `3e82f7a` ضمن `main@58ddddc` + حارس `test:section-guard` |
| Discover → `SECTION_ROUTE` فقط | ✅ #25 + حماية CI |

**التالي:** Replit يسحب ويُثبت بالشوتات · Copilot يوثّق مراجعة post-merge إن لزم.

### W2 — FI تشغيلي (#28)
| هدف | قبول |
|-----|------|
| تسجيل بنك لا يُسقِط لـ dealer بالخطأ | `intent=fi` / account_type صحيح |
| KYC docs ظاهرة قبل verify | أدمن يرى المستندات |
| فروع/مقاعد أدمن أساسية | UI #28 |

**مالك:** Cursor (كود #28) · Copilot يراجع عقد API قبل الدمج.

### W3 — أمان FI (بعد دمج #28 فقط)
| هدف | قبول (من خطة Claude — نعتمدها) |
|-----|------|
| AuthZ فرع على PATCH | seat A + طلب B → 403/404 |
| آلة حالات | رفض `closed→contacted` |
| owner_user_id | يشترط دور FI (+ verified حسب العقد) |
| docs merge | إعادة حفظ بلا documents لا تمسح |
| isActive | forward لوسيط inactive يفشل بوضوح |
| NO-WIPE | كل اختبارات inbox/branch/handoff تبقى خضراء |

**منفّذ:** كان Claude → **الآن Copilot تحت Cursor** بعد جملة Start W3 من المالك فقط.  
**جملة الإطلاق الوحيدة:**  
`Start W3 — Copilot owns F-SEC-01/02/03 + docs/isActive under Cursor QA. Base = origin/main after W2/#28. Go.`

### W4 — محاذاة موبايل وصدق الواجهة
| هدف | قبول |
|-----|------|
| هيدر قسم غير مزدحم | ✅ مدمج `#34` → `58ddddc` |
| MOB-04 RTL غلاف | ✅ مدمج `#33` → `a894f5a` |
| MOB-01 هاتف في edit | ⏳ Copilot CP-2 |
| Banks: لا chevron ميّت / لا «شركاء موثّقون» بلا بيانات | ⏳ Copilot audit + قرار Owner |
| CategoryTabs لا تخلط Discover | ⏳ Cursor بعد تحقق Replit |

**منفّذون:** Copilot (MOB-01 + Banks) · Replit (شوتات) · Owner (قرار directory).

### W5 — Stay شكل
| هدف | قبول |
|-----|------|
| هيدر أسود شيك | دمج #23 `StaysHomeHeader` · إلغاء أي BoomStayHeader مكرر |

### W6/W7 — دولي / Scale
🔒 مؤجّل بقرار Owner — لا عمل قبل إثبات حاجة + حمل.

---

## أهداف أفقية (كل موجة)

1. **Additive only / NO-WIPE** — لا مسح ميزات inbox أو sections أو profile.  
2. **ملف:سطر أو اختبار** لكل ادّعاء إصلاح.  
3. **CI أخضر** قبل طلب دمج.  
4. **لا خلط فلاتر** بين Search العام والميني-آب.  
5. **أيقونات SVG فقط** + i18n en/ar.  
6. **صدق النسخ** — إن لم يوجد directory شركاء، لا تُكتب «موثّقون» فوق ثوابت.

---

## قائمة دمج — حالة

1. ~~#32 W1~~ ✅  
2. ~~#33 MOB-04~~ ✅  
3. ~~#34 W4 sort~~ ✅  
4. **التالي للمالك:** سحب Replit `@58ddddc` + شوتات  
5. #28 (W2) بعد تحقق Replit/Copilot  
6. ثم فقط Start W3  
7. #23 Stay عند جاهزية الشكل  


— Cursor
