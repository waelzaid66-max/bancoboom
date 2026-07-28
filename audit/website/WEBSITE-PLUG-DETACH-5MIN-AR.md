# كيف تفصل فيشة الموقع في 5 دقائق

**الغرض:** إيقاف `banco-web` فقط دون لمس الموبايل أو الـ API أو الماركت أو الأدمن.  
**Phase:** 6 — Plug hardening  

---

## متى تفصل؟

- عطل واجهة ويب / SEO سيئ / حادثة أمنية على سطح الويب  
- ضغط غير متوقع على CDN الويب  
- تجريب staged rollback  

**لا تفصل** إذا المشكلة في API — أصلِح API؛ الموبايل يعتمد عليه.

---

## الطريقة أ — Kill-switch سريع (مستحسن)

على حاوية / خدمة `banco-web` فقط:

```bash
# مثال Docker Compose
WEB_PLUG_ENABLED=false docker compose -f deploy/aws/docker-compose.banco-web.yml up -d

# أو إعادة تشغيل مع متغير بيئة
export WEB_PLUG_ENABLED=false
# ثم restart لخدمة consumer-web فقط
```

**النتيجة المتوقعة**

| مسار | السلوك |
|------|--------|
| `/` وباقي الصفحات | صفحة صيانة (`/maintenance`) |
| `/api/health` و `/api/healthz` | **200** مع `"plug":"off"` |
| موبايل / API / dealer-os | **بدون تغيير** |

تحقق:

```bash
curl -sS "$BANCO_WEB_URL/api/health"
# {"status":"ok","surface":"banco-web","plug":"off",...}

curl -sSI "$BANCO_WEB_URL/" | grep -i x-banco-web-plug
# X-Banco-Web-Plug: off
```

---

## الطريقة ب — فصل CDN / الخدمة بالكامل

إن أردت إيقاف الأصل نفسه:

1. عطّل خدمة `consumer-web` أو أزل listener من الـ ALB/CDN.  
2. (اختياري) أشر الدومين لصفحة صيانة ثابتة عند المزود.  
3. **لا** توقّف API ولا EAS.

تحقق: الموبايل يسجّل دخول ويستدعي API كالمعتاد.

---

## إعادة التوصيل

```bash
WEB_PLUG_ENABLED=true   # أو احذف المتغير (الافتراضي = on)
# restart consumer-web فقط
```

```bash
curl -sS "$BANCO_WEB_URL/api/health"
# "plug":"on"
```

---

## ملاحظات تشغيل

- **بدون rebuild** عند استخدام `WEB_PLUG_ENABLED` وقت التشغيل (Compose/K8s env).  
- `NEXT_PUBLIC_WEB_PLUG_ENABLED` اختياري للمعاينات الثابتة ويتطلب build.  
- Health يبقى أخضر والمراقبة تفرّق: `plug=off` ≠ عملية ميتة.  
- تحكم أدمن لاحق (`consumer_web_enabled` عبر API) **خارج** هذه الموجة — لا يلمس `admin-os`/`api-server` هنا.

---

## مراجع

- الميثاق: [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)  
- حالة Phase 6: [`WEBSITE-PHASE6-PLUG-HARDENING-STATUS-AR.md`](./WEBSITE-PHASE6-PLUG-HARDENING-STATUS-AR.md)  
