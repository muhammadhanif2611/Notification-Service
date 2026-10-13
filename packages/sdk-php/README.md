# notification-gateway/sdk

[![Packagist](https://img.shields.io/packagist/v/notification-gateway/sdk)](https://packagist.org/packages/notification-gateway/sdk)
[![PHP](https://img.shields.io/packagist/php-v/notification-gateway/sdk)](https://packagist.org/packages/notification-gateway/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SDK PHP resmi untuk **Notification Gateway** — kirim WhatsApp, Email, dan Broadcast notifikasi dari aplikasi PHP Anda. Mendukung Laravel, Symfony, dan framework PHP lainnya.

---

## Instalasi

```bash
composer require notification-gateway/sdk
```

---

## Quick Start

```php
<?php

use NotificationGateway\NotificationClient;

$client = new NotificationClient(
    apiKey: 'ngw_prod_xxxxxxxxxxxxxxxx',   // API Key dari dashboard
    baseUrl: 'http://localhost:3001',       // URL Gateway (ganti production URL)
);

// Kirim WhatsApp
$result = $client->whatsapp->send(
    to: '6281234567890',
    body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.',
);
echo $result['messageId']; // msg_...
```

---

## Integrasi Laravel

### Service Provider (opsional)

```php
// app/Providers/NotificationGatewayServiceProvider.php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use NotificationGateway\NotificationClient;

class NotificationGatewayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NotificationClient::class, fn() => new NotificationClient(
            apiKey: config('services.notification_gateway.api_key'),
            baseUrl: config('services.notification_gateway.base_url', 'http://localhost:3001'),
        ));
    }
}
```

```php
// config/services.php
'notification_gateway' => [
    'api_key'  => env('NGW_API_KEY'),
    'base_url' => env('NGW_BASE_URL', 'http://localhost:3001'),
],
```

### Contoh di Controller

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use NotificationGateway\NotificationClient;

class OrderController extends Controller
{
    public function __construct(private readonly NotificationClient $ngw) {}

    public function confirm(Request $request, string $orderId): \Illuminate\Http\JsonResponse
    {
        $result = $this->ngw->whatsapp->send(
            to: $request->user()->phone,
            body: "Pesanan #{$orderId} telah dikonfirmasi!",
        );

        return response()->json(['messageId' => $result['messageId']]);
    }
}
```

### Webhook di Laravel

```php
// routes/api.php
Route::post('/webhook/notification', [WebhookController::class, 'handle'])
    ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);
```

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use NotificationGateway\NotificationClient;
use NotificationGateway\Exception\WebhookVerificationException;

class WebhookController extends Controller
{
    public function handle(Request $request, NotificationClient $ngw): \Illuminate\Http\JsonResponse
    {
        try {
            $event = $ngw->webhooks->verify(
                rawBody: $request->getContent(), // WAJIB raw body
                headers: $request->headers->all(),
                secret: config('services.notification_gateway.webhook_secret'),
            );
        } catch (WebhookVerificationException) {
            return response()->json(['error' => 'Invalid webhook'], 400);
        }

        // Proses event
        logger()->info('Webhook diterima', [
            'type'      => $event['type'],
            'messageId' => $event['data']['messageId'],
            'status'    => $event['data']['status'],
        ]);

        return response()->json(['received' => true]);
    }
}
```

---

## Integrasi Symfony

```php
// src/Service/NotificationService.php
namespace App\Service;

use NotificationGateway\NotificationClient;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class NotificationService
{
    private NotificationClient $client;

    public function __construct(
        #[Autowire(env: 'NGW_API_KEY')] string $apiKey,
        #[Autowire(env: 'NGW_BASE_URL')] string $baseUrl = 'http://localhost:3001',
    ) {
        $this->client = new NotificationClient(apiKey: $apiKey, baseUrl: $baseUrl);
    }

    public function kirimWhatsApp(string $nomor, string $pesan): array
    {
        return $this->client->whatsapp->send(to: $nomor, body: $pesan);
    }
}
```

---

## Contoh Penggunaan Lengkap

### Kirim WhatsApp

```php
// Teks biasa
$result = $client->whatsapp->send(
    to: '6281234567890',
    body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.',
);

// Dengan template
$result = $client->whatsapp->send(
    to: '6281234567890',
    templateCode: 'otp_verification',
    variables: ['nama' => 'Budi', 'otp' => '894211'],
);
```

### Kirim Email

```php
$result = $client->email->send(
    to: 'budi@perusahaan.com',
    subject: 'Konfirmasi Pembayaran #INV-10291',
    body: '<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>',
);
```

### Broadcast Massal

```php
$result = $client->broadcast->send(
    channel: 'WHATSAPP',
    recipients: ['6281234567890', '6281234567891'],
    templateCode: 'pengumuman_hrd',
    variables: ['periode' => 'Q3 2026'],
    recipientVariables: [
        '6281234567890' => ['nama' => 'Biagi'],
        '6281234567891' => ['nama' => 'Andi'],
    ],
);
echo $result['broadcastId'] . ' — ' . $result['totalQueued'] . ' pesan';
```

### Verifikasi Webhook (PHP Native)

```php
<?php
// endpoint: POST /webhook/notification

use NotificationGateway\NotificationClient;
use NotificationGateway\Exception\WebhookVerificationException;

$client = new NotificationClient(apiKey: $_ENV['NGW_API_KEY']);

$rawBody = file_get_contents('php://input'); // WAJIB raw body mentah
try {
    $event = $client->webhooks->verify(
        rawBody: $rawBody,
        headers: getallheaders(),
        secret: $_ENV['NGW_WEBHOOK_SECRET'], // whsec_...
    );
} catch (WebhookVerificationException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid webhook']);
    exit;
}

// Proses event
error_log($event['type'] . ' — ' . $event['data']['messageId']);
echo json_encode(['received' => true]);
```

---

## Referensi API

### `new NotificationClient(apiKey, baseUrl, timeout, maxRetries)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `apiKey` | `string` | *wajib* | API Key (`ngw_prod_...` / `ngw_sand_...`) |
| `baseUrl` | `string` | `http://localhost:3001` | URL Gateway |
| `timeout` | `float` | `10.0` | Timeout dalam detik |
| `maxRetries` | `int` | `2` | Retry untuk error 5xx/jaringan |

### `$client->whatsapp->send(to, body, templateCode, variables)`
### `$client->email->send(to, subject, body, templateCode, variables)`
### `$client->broadcast->send(channel, recipients, body, subject, templateCode, variables, recipientVariables)`
### `$client->webhooks->verify(rawBody, headers, secret, tolerance)`

---

## Format Respons

**Sukses (HTTP 202):**
```json
{ "success": true, "data": { "messageId": "msg_abc123", "status": "QUEUED" } }
```

| HTTP Status | Exception | Keterangan |
|---|---|---|
| 401 | `AuthenticationException` | API Key tidak valid/nonaktif |
| 429 | `RateLimitException` | Rate limit / kuota habis |
| 4xx/5xx | `NotificationException` | Error umum |
| — | `WebhookVerificationException` | Signature webhook tidak valid |

---

## Publish ke Packagist

1. Push repo ke GitHub
2. Daftar paket di [packagist.org](https://packagist.org/packages/submit)
3. Tambahkan GitHub webhook untuk auto-update saat release baru

---

## Lisensi

MIT
