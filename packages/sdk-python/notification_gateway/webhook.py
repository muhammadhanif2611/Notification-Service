"""
Verifikasi signature webhook dari Notification Gateway.

Mengimplementasikan algoritma Svix/Resend:
  ``v1,base64(HMAC_SHA256("id.timestamp.rawBody", decoded_secret))``

Secret format: ``whsec_<base64bytes>`` — bagian base64 di-decode dulu
sebelum digunakan sebagai kunci HMAC.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from notification_gateway.exceptions import WebhookVerificationError

_DEFAULT_TOLERANCE_SECONDS = 300  # 5 menit — anti replay attack


def _get_secret_bytes(secret: str) -> bytes:
    """Normalkan secret → bytes kunci HMAC."""
    if secret.startswith("whsec_"):
        return base64.b64decode(secret[len("whsec_"):])
    return secret.encode("utf-8")


def verify_webhook(
    payload: str | bytes,
    headers: dict[str, str],
    secret: str,
    tolerance: int = _DEFAULT_TOLERANCE_SECONDS,
) -> dict[str, Any]:
    """
    Verifikasi signature webhook dan kembalikan payload ter-parse.

    Args:
        payload: Raw body HTTP request (string atau bytes, JANGAN di-parse dulu).
        headers: Dict header request. Kunci case-insensitive.
        secret: Webhook secret dari dashboard (format ``whsec_...``).
        tolerance: Toleransi timestamp dalam detik (default 300 = 5 menit).

    Returns:
        Payload webhook sebagai dict Python.

    Raises:
        WebhookVerificationError: Jika signature tidak valid, timestamp kadaluarsa,
            atau header tidak lengkap.

    Example::

        # Flask
        @app.post('/webhook/notification')
        def webhook():
            event = verify_webhook(
                payload=request.get_data(),
                headers=dict(request.headers),
                secret=os.environ['NGW_WEBHOOK_SECRET'],
            )
            return {'received': True}
    """
    # Normalisasi headers ke lowercase untuk lookup case-insensitive
    lower_headers = {k.lower(): v for k, v in headers.items()}

    wh_id = lower_headers.get("webhook-id")
    timestamp = lower_headers.get("webhook-timestamp")
    signature = lower_headers.get("webhook-signature")

    if not (wh_id and timestamp and signature):
        raise WebhookVerificationError(
            "Header webhook tidak lengkap. Pastikan 'webhook-id', "
            "'webhook-timestamp', dan 'webhook-signature' tersedia."
        )

    # 1. Validasi timestamp — mencegah replay attack
    try:
        ts_int = int(timestamp)
    except ValueError as exc:
        raise WebhookVerificationError("Format webhook-timestamp tidak valid") from exc

    elapsed = abs(time.time() - ts_int)
    if elapsed > tolerance:
        raise WebhookVerificationError(
            f"Webhook timestamp kadaluarsa ({elapsed:.0f}s > {tolerance}s toleransi)"
        )

    # 2. Hitung signature dari raw body (tidak re-serialize JSON)
    raw_body = payload.decode("utf-8") if isinstance(payload, bytes) else payload
    key = _get_secret_bytes(secret)
    signed_content = f"{wh_id}.{timestamp}.{raw_body}".encode("utf-8")
    expected = "v1," + base64.b64encode(
        hmac.new(key, signed_content, hashlib.sha256).digest()
    ).decode()

    # 3. Bandingkan dengan timing-safe compare (support multi-signature Svix)
    is_valid = any(
        hmac.compare_digest(expected, sig.strip())
        for sig in signature.split(" ")
        if sig.strip()
    )

    if not is_valid:
        raise WebhookVerificationError("Webhook signature tidak valid")

    return json.loads(raw_body)


class WebhookVerifier:
    """
    Wrapper class untuk verifikasi webhook.

    Diakses via ``client.webhooks``.

    Example::

        event = client.webhooks.verify(
            payload=raw_body,
            headers={'webhook-id': ..., 'webhook-timestamp': ..., 'webhook-signature': ...},
            secret='whsec_...',
        )
    """

    def verify(
        self,
        payload: str | bytes,
        headers: dict[str, str],
        secret: str,
        tolerance: int = _DEFAULT_TOLERANCE_SECONDS,
    ) -> dict[str, Any]:
        """
        Verifikasi signature webhook (alias untuk :func:`verify_webhook`).

        Args:
            payload: Raw body HTTP request.
            headers: Dict header request.
            secret: Webhook secret (``whsec_...``).
            tolerance: Toleransi timestamp detik (default 300).

        Returns:
            Payload webhook sebagai dict.

        Raises:
            WebhookVerificationError: Jika verifikasi gagal.
        """
        return verify_webhook(payload, headers, secret, tolerance)
