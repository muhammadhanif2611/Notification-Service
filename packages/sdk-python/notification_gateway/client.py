"""
NotificationClient — entry point utama SDK.
"""

from __future__ import annotations

from notification_gateway.channels.broadcast import BroadcastClient
from notification_gateway.channels.email import EmailClient
from notification_gateway.channels.whatsapp import WhatsAppClient
from notification_gateway.http import AsyncHttpClient, HttpClient, _DEFAULT_BASE_URL
from notification_gateway.webhook import WebhookVerifier

_DEFAULT_TIMEOUT = 10.0
_DEFAULT_MAX_RETRIES = 2


class NotificationClient:
    """
    Client utama Notification Gateway SDK.

    Menyediakan akses ke semua channel pengiriman dan verifikasi webhook.

    Args:
        api_key: API Key dari dashboard (``ngw_prod_...`` atau ``ngw_sand_...``).
        base_url: URL base Gateway API. Default: ``https://gateway-service-production-9201.up.railway.app``.
        timeout: Timeout request dalam detik. Default: ``10.0``.
        max_retries: Jumlah percobaan ulang untuk error jaringan/5xx. Default: ``2``.

    Example::

        from notification_gateway import NotificationClient

        client = NotificationClient(
            api_key="ngw_prod_xxxxxxxxxxxxxxxx",
            base_url="https://gateway-service-production-9201.up.railway.app",
        )

        # Kirim WhatsApp
        result = client.whatsapp.send(to="6281234567890", body="Halo!")

        # Kirim Email
        result = client.email.send(
            to="budi@perusahaan.com",
            subject="Konfirmasi Pembayaran",
            body="<h1>Terima kasih!</h1>",
        )

        # Broadcast ke banyak penerima
        result = client.broadcast.send(
            channel="WHATSAPP",
            recipients=["6281234567890", "6281234567891"],
            template_code="pengumuman_hrd",
            variables={"periode": "Q3 2026"},
        )

        # Verifikasi webhook
        event = client.webhooks.verify(
            payload=raw_body,
            headers=dict(request.headers),
            secret="whsec_...",
        )
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        max_retries: int = _DEFAULT_MAX_RETRIES,
    ) -> None:
        if not api_key:
            raise ValueError("'api_key' wajib diisi untuk menginisialisasi NotificationClient")

        _http = HttpClient(api_key, base_url, timeout, max_retries)
        _async_http = AsyncHttpClient(api_key, base_url, timeout, max_retries)
        self._http = _http
        self._async_http = _async_http

        self.whatsapp = WhatsAppClient(_http, _async_http)
        """Client untuk mengirim pesan WhatsApp."""

        self.email = EmailClient(_http, _async_http)
        """Client untuk mengirim email."""

        self.broadcast = BroadcastClient(_http, _async_http)
        """Client untuk broadcast ke banyak penerima."""

        self.webhooks = WebhookVerifier()
        """Verifier untuk signature webhook masuk."""

    def ping(self) -> dict:
        """Verifikasi koneksi dan API Key tanpa mengirim pesan."""
        return self._http.get("/v1/notifications/ping")

    def test_connection(self) -> dict:
        return self.ping()

    async def ping_async(self) -> dict:
        return await self._async_http.get("/v1/notifications/ping")

    async def test_connection_async(self) -> dict:
        return await self.ping_async()
