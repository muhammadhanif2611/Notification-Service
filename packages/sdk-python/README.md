# notification-gateway-sdk

[![PyPI](https://img.shields.io/pypi/v/notification-gateway-sdk)](https://pypi.org/project/notification-gateway-sdk/)
[![Python](https://img.shields.io/pypi/pyversions/notification-gateway-sdk)](https://pypi.org/project/notification-gateway-sdk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SDK Python resmi untuk **Notification Gateway** — kirim WhatsApp, Email, dan Broadcast notifikasi dari aplikasi Python Anda. Mendukung **async** (httpx) untuk FastAPI dan **sync** (requests) untuk Flask/Django.

---

## Instalasi

Rilis 1.0.1 tersedia melalui [GitHub Release](https://github.com/muhammadhanif2611/Notification-Service/releases/tag/sdk%2Fv1.0.1):

```bash
pip install "https://github.com/muhammadhanif2611/Notification-Service/releases/download/sdk%2Fv1.0.1/notification_gateway_sdk-1.0.1-py3-none-any.whl"
```

Perintah registry di bawah memerlukan paket sudah diterbitkan ke registry tersebut.

```bash
pip install notification-gateway-sdk
```

Atau dengan dependency manager:

```bash
# uv
uv add notification-gateway-sdk

# poetry
poetry add notification-gateway-sdk
```

---

## Quick Start

```python
from notification_gateway import NotificationClient

client = NotificationClient(
    api_key="ngw_prod_xxxxxxxxxxxxxxxx",   # API Key dari dashboard
    base_url="https://gateway-service-production-9201.up.railway.app",       # URL Gateway (dapat diubah untuk deployment lain)
)

# Kirim WhatsApp
result = client.whatsapp.send(
    to="6281234567890",
    body="Halo! Pesanan Anda #INV-10291 telah dikirim.",
)
print(result["messageId"])  # msg_...
```

---

## Integrasi FastAPI (Async)

```python
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Header, HTTPException
from notification_gateway import NotificationClient

client = NotificationClient(api_key=os.environ["NGW_API_KEY"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/kirim-notifikasi")
async def kirim_notifikasi(body: dict):
    result = await client.whatsapp.send_async(
        to=body["nomor"],
        body=body["pesan"],
    )
    return {"messageId": result["messageId"]}


@app.post("/broadcast")
async def broadcast(body: dict):
    result = await client.broadcast.send_async(
        channel="WHATSAPP",
        recipients=body["recipients"],
        template_code="pengumuman_hrd",
        variables={"periode": "Q3 2026"},
        recipient_variables=body.get("recipientVariables"),
    )
    return result


@app.post("/webhook/notification")
async def webhook_handler(
    request: Request,
    webhook_id: str = Header(alias="webhook-id"),
    webhook_timestamp: str = Header(alias="webhook-timestamp"),
    webhook_signature: str = Header(alias="webhook-signature"),
):
    raw_body = await request.body()
    try:
        event = client.webhooks.verify(
            payload=raw_body,
            headers={
                "webhook-id": webhook_id,
                "webhook-timestamp": webhook_timestamp,
                "webhook-signature": webhook_signature,
            },
            secret=os.environ["NGW_WEBHOOK_SECRET"],
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # Proses event
    print(event["type"], event["data"]["messageId"], event["data"]["status"])
    return {"received": True}
```

---

## Integrasi Flask (Sync)

```python
import os
from flask import Flask, request, jsonify
from notification_gateway import NotificationClient

app = Flask(__name__)
client = NotificationClient(api_key=os.environ["NGW_API_KEY"])


@app.post("/kirim-notifikasi")
def kirim_notifikasi():
    data = request.get_json()
    result = client.whatsapp.send(
        to=data["nomor"],
        body=data["pesan"],
    )
    return jsonify({"messageId": result["messageId"]})


@app.post("/kirim-email")
def kirim_email():
    data = request.get_json()
    result = client.email.send(
        to=data["to"],
        subject=data["subject"],
        body=data["body"],
    )
    return jsonify(result)


@app.post("/webhook/notification")
def webhook_handler():
    raw_body = request.get_data()  # WAJIB raw body mentah
    try:
        event = client.webhooks.verify(
            payload=raw_body,
            headers=dict(request.headers),
            secret=os.environ["NGW_WEBHOOK_SECRET"],
        )
    except Exception:
        return jsonify({"error": "Invalid webhook"}), 400

    print(event["type"], event["data"]["messageId"])
    return jsonify({"received": True})
```

---

## Referensi API

### `NotificationClient(api_key, base_url, timeout, max_retries)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `api_key` | `str` | *wajib* | API Key dari dashboard (`ngw_prod_...` / `ngw_sand_...`) |
| `base_url` | `str` | `https://gateway-service-production-9201.up.railway.app` | URL Gateway |
| `timeout` | `float` | `10.0` | Timeout request dalam detik |
| `max_retries` | `int` | `2` | Jumlah retry untuk error 5xx/jaringan |

### `client.whatsapp.send(to, body, template_code, variables)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `to` | `str` | Nomor WhatsApp format internasional (tanpa `+`) |
| `body` | `str \| None` | Teks pesan bebas |
| `template_code` | `str \| None` | Kode template ter-approve |
| `variables` | `dict \| None` | Variabel template, mis. `{"nama": "Budi"}` |

Versi async: `await client.whatsapp.send_async(...)`

### `client.email.send(to, subject, body, template_code, variables)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `to` | `str` | Alamat email tujuan |
| `subject` | `str` | Subject email |
| `body` | `str` | Konten HTML/teks |
| `template_code` | `str \| None` | Kode template (opsional) |
| `variables` | `dict \| None` | Variabel template (opsional) |

Versi async: `await client.email.send_async(...)`

### `client.broadcast.send(channel, recipients, ...)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `channel` | `str` | `"WHATSAPP"` atau `"EMAIL"` |
| `recipients` | `list[str]` | Daftar nomor/email penerima |
| `body` | `str \| None` | Teks pesan |
| `subject` | `str \| None` | Subject email |
| `template_code` | `str \| None` | Kode template |
| `variables` | `dict \| None` | Variabel global |
| `recipient_variables` | `dict \| None` | Variabel per penerima |

Versi async: `await client.broadcast.send_async(...)`

### `client.webhooks.verify(payload, headers, secret, tolerance)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `payload` | `str \| bytes` | Raw body request (JANGAN parse dulu) |
| `headers` | `dict` | Header HTTP request |
| `secret` | `str` | Webhook secret (`whsec_...`) |
| `tolerance` | `int` | Toleransi timestamp dalam detik (default 300) |

Returns `dict` (payload ter-parse) atau raises `WebhookVerificationError`.

---

## Format Respons

**Sukses (HTTP 202):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "QUEUED"
  }
}
```

**Error (HTTP 4xx/5xx):**
```json
{
  "success": false,
  "error": "Invalid API Key"
}
```

| HTTP Status | Exception | Keterangan |
|---|---|---|
| 401 | `AuthenticationError` | API Key tidak valid/nonaktif |
| 429 | `RateLimitError` | Rate limit / kuota habis |
| 4xx/5xx | `NotificationError` | Error umum |

---

## Verifikasi koneksi

```python
client.ping()                         # sync: {"success": True, "data": {...}}
await client.ping_async()             # async
client.test_connection()              # alias ping
await client.test_connection_async()  # alias ping_async
```

Ping tidak mengirim pesan. Error API mempertahankan `str(error)`, `error.status_code`, dan `error.code`. URL lokal tetap dapat diberikan lewat `base_url="http://localhost:3001"`.

## Publish ke PyPI

```bash
# Build
pip install hatchling
python -m hatch build

# Upload ke PyPI
pip install twine
twine check ../../artifacts/python/*
twine upload ../../artifacts/python/*
```

Atau gunakan GitHub Actions (`.github/workflows/publish-pypi.yml`).

---

## Lisensi

MIT
