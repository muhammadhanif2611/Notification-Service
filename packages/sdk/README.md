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
  baseUrl: 'https://gateway.company.com' // Opsional (default: http://localhost:3001)
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
