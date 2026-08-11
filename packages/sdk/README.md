# 📦 @notification-gateway/sdk (Pure JavaScript)

Developer Client SDK resmi berbasis **100% Pure JavaScript (Node.js)** untuk mempermudah integrasi pengiriman notifikasi multi-channel (WhatsApp & Email) pada aplikasi internal perusahaan.

---

## 🚀 Instalasi

```bash
npm install @notification-gateway/sdk
# atau
pnpm add @notification-gateway/sdk
```

---

## ⚡ Cara Penggunaan (JavaScript / ESM)

### 1. Inisialisasi SDK Client

```javascript
import { NotificationClient } from '@notification-gateway/sdk';

const client = new NotificationClient({
  apiKey: 'ngw_prod_hris_98a71b2c3d4e...', // Dapatkan dari Admin Portal
  baseUrl: 'https://gateway.company.com', // Opsional (default: http://localhost:3001)
  timeout: 10000 // Opsional (default: 10000ms)
});
```

---

### 2. Pengiriman Notifikasi WhatsApp

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

### 3. Pengiriman Email HTML

```javascript
const resEmail = await client.email.send({
  to: 'budi@company.com',
  subject: 'Konfirmasi Pembayaran Invoice #INV-10291',
  body: '<h1>Terima kasih!</h1><p>Pembayaran Anda sebesar Rp 150.000 telah diterima.</p>'
});
```

---

### 4. Broadcast Notifikasi Massal

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

### 5. Verifikasi Webhook Signature

```javascript
// Di endpoint webhook receiver Anda
app.post('/webhook/notification', (req, res) => {
  const isValid = client.verifyWebhook({
    payload: req.body,
    signature: req.headers['x-webhook-signature'],
    secret: 'your-webhook-secret'
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Proses webhook...
  console.log('Status:', req.body.status); // SENT / DELIVERED / FAILED
  console.log('Message ID:', req.body.messageId);
  res.json({ received: true });
});
```

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

