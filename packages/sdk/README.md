# 📦 notification-gateway-sdk (Pure JavaScript)

Developer Client SDK resmi berbasis **100% Pure JavaScript (Node.js)** untuk mempermudah integrasi pengiriman notifikasi multi-channel pada aplikasi internal perusahaan.

> **Provider pengiriman** (dikelola di sisi gateway, transparan untuk SDK):
> - **WhatsApp** → [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web multi-device)
> - **Email** → [Nodemailer](https://nodemailer.com) (SMTP)
>
> Client tidak perlu tahu provider — cukup panggil `client.whatsapp.send()` / `client.email.send()`.

---

## 🚀 Instalasi

Rilis 1.0.1 tersedia melalui [GitHub Release](https://github.com/muhammadhanif2611/Notification-Service/releases/tag/sdk%2Fv1.0.1):

```bash
npm install "https://github.com/muhammadhanif2611/Notification-Service/releases/download/sdk%2Fv1.0.1/notification-gateway-sdk-1.0.1.tgz"
```

Perintah registry di bawah memerlukan paket sudah diterbitkan ke registry tersebut.

```bash
npm install notification-gateway-sdk
# atau
pnpm add notification-gateway-sdk
```

---

## ⚡ Cara Penggunaan (JavaScript / ESM)

### 1. Inisialisasi SDK Client

```javascript
import { NotificationClient } from 'notification-gateway-sdk';

const client = new NotificationClient({
  apiKey: 'ngw_prod_hris_98a71b2c3d4e...', // Dapatkan dari Dashboard
  baseUrl: 'https://gateway-service-production-9201.up.railway.app', // Opsional (default: https://gateway-service-production-9201.up.railway.app)
  timeout: 10000,                          // Opsional (default: 10000ms)
  mode: 'cors',                           // Opsional (default: cors)
  credentials: 'omit'                     // Opsional (default: omit)
});
```

---

### 2. Uji Koneksi / Handshake (Ping)

Gunakan `client.ping()` setelah inisialisasi untuk memverifikasi API Key dan memberi tahu Gateway bahwa SDK Anda telah aktif:

```javascript
const connection = await client.ping();
console.log(connection);
// Output:
// {
//   success: true,
//   data: {
//     status: 'connected',
//     project: { name: 'Aplikasi Kasir', slug: 'aplikasi-kasir' },
//     environment: 'production',
//     dailyQuota: 5000
//   }
// }
```

---

### 3. Pengiriman Notifikasi WhatsApp

```javascript
// Kirim Pesan WhatsApp Biasa
const resText = await client.whatsapp.send({
  to: '6281234567890',
  body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.'
});

console.log(resText.messageId); // e.g. "msg_1722739182_abc123"

// Kirim WhatsApp Template Resmi
const resTemplate = await client.whatsapp.send({
  to: '6281234567890',
  templateCode: 'otp_verification',
  variables: {
    code: '894211',
    nama: 'Budi'
  }
});
```

---

### 4. Pengiriman Email HTML

```javascript
const resEmail = await client.email.send({
  to: 'budi@company.com',
  subject: 'Konfirmasi Pembayaran Invoice #INV-10291',
  body: '<h1>Terima kasih!</h1><p>Pembayaran Anda sebesar Rp 150.000 telah diterima.</p>'
});
```

---

### 5. Broadcast Notifikasi Massal

```javascript
// Kirim pesan yang sama ke banyak penerima sekaligus
const resBroadcast = await client.broadcast.send({
  channel: 'WHATSAPP', // atau 'EMAIL'
  recipients: [
    '6281234567890',
    '6281234567891',
    '6281234567892'
  ],
  templateCode: 'promo_blast',
  variables: {
    promoCode: 'DISC50',
    validUntil: '31 Desember 2024'
  }
});

console.log(resBroadcast.broadcastId); // e.g. "bcast_1722739182_abc123"
console.log(resBroadcast.totalQueued); // 3
```

---

### 6. Verifikasi Webhook (pola Resend/Svix)

Gateway mengirim HTTP POST ke endpoint Anda dengan format event:

```json
{
  "type": "notification.status_update",
  "created_at": "2026-08-13T10:00:00.000Z",
  "data": { "messageId": "msg_...", "status": "SENT", "error": null }
}
```

Setiap request menyertakan header:

| Header | Deskripsi |
|---|---|
| `webhook-id` | ID unik per event — bisa dipakai untuk idempotency |
| `webhook-timestamp` | Unix timestamp (detik) — dicek toleransi 5 menit agar replay attack tertolak |
| `webhook-signature` | Signature HMAC-SHA256 format `v1,<base64>`, dihitung dari `${id}.${timestamp}.${rawBody}` |

**Express.js:**

```javascript
// PENTING: pakai express.raw agar body tetap string mentah
app.post('/webhook/notification',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const event = client.webhooks.verify({
        payload: req.body.toString(), // raw body WAJIB string mentah
        headers: {
          id: req.headers['webhook-id'],
          timestamp: req.headers['webhook-timestamp'],
          signature: req.headers['webhook-signature'],
        },
        secret: process.env.NGW_WEBHOOK_SECRET, // whsec_...
      });

      console.log(event.type, event.data.messageId, event.data.status);
      res.json({ received: true });
    } catch {
      res.status(400).json({ error: 'Invalid webhook' });
    }
  }
);
```

**Next.js (App Router):**

```javascript
export async function POST(req) {
  const payload = await req.text(); // raw body via .text()
  try {
    const event = client.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('webhook-id'),
        timestamp: req.headers.get('webhook-timestamp'),
        signature: req.headers.get('webhook-signature'),
      },
      secret: process.env.NGW_WEBHOOK_SECRET,
    });
    console.log(event.type, event.data);
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
```

> **Catatan:** Signature dihitung dari *raw request body*. Framework yang me-parse JSON
> lalu me-stringify ulang akan membuat signature mismatch — selalu verifikasi dari body mentah.
> Metode legacy `client.verifyWebhook({ payload, signature, secret })` (header `X-Gateway-Signature`)
> masih tersedia untuk kompatibilitas integrasi lama.

---

## 📋 Response Format

### Sukses

```json
{
  "success": true,
  "data": {
    "messageId": "msg_1722739182_abc123",
    "status": "QUEUED",
    "channel": "WHATSAPP",
    "recipient": "6281234567890",
    "isSandbox": false,
    "acceptedAt": "2024-08-11T08:55:48.060Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "recipient is required"
  }
}
```

---

## ⚠️ Error Codes

| Code | HTTP | Keterangan |
|:---|:---|:---|
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `UNAUTHORIZED` | 401 | API Key salah/expired |
| `PROJECT_NOT_FOUND` | 404 | Project tidak ditemukan |
| `TEMPLATE_NOT_FOUND` | 404 | Template tidak ditemukan |
| `TEMPLATE_NOT_APPROVED` | 422 | Template belum di-approve |
| `DAILY_QUOTA_EXCEEDED` | 429 | Kuota harian habis |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit per menit terlampaui |
| `SERVICE_UNAVAILABLE` | 502 | Service internal down |

---

## 🧪 Sandbox Mode

Gunakan API Key dengan prefix `ngw_sand_` untuk testing tanpa benar-benar mengirim pesan:

```javascript
const sandboxClient = new NotificationClient({
  apiKey: 'ngw_sand_xxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
});

// Tidak akan benar-benar terkirim, tapi tetap tercatat di log
await sandboxClient.whatsapp.send({
  to: '6281234567890',
  body: 'Test sandbox'
});
```

---

## 📄 License

ISC

