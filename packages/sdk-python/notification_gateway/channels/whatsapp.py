"""
WhatsApp channel client.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from notification_gateway.http import AsyncHttpClient, HttpClient

_ENDPOINT = "/v1/notifications/send"


class WhatsAppClient:
    """
    Client untuk mengirim pesan WhatsApp melalui Notification Gateway.

    Diakses via ``client.whatsapp``.
    """

    def __init__(self, http: "HttpClient", async_http: "AsyncHttpClient") -> None:
        self._http = http
        self._async_http = async_http

    def send(
        self,
        to: str,
        body: str | None = None,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Mengirim pesan WhatsApp (sync).

        Args:
            to: Nomor tujuan format internasional tanpa ``+``, mis. ``6281234567890``.
            body: Teks pesan bebas. Wajib jika tidak pakai ``template_code``.
            template_code: Kode template ter-approve di dashboard.
            variables: Variabel untuk template, mis. ``{"nama": "Budi", "otp": "1234"}``.

        Returns:
            Dict berisi ``messageId`` dan ``status`` (``QUEUED``).

        Raises:
            NotificationError: Jika request gagal.
        """
        payload = self._build_payload(to, body, template_code, variables)
        response = self._http.post(_ENDPOINT, payload)
        return response.get("data", response)

    async def send_async(
        self,
        to: str,
        body: str | None = None,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Mengirim pesan WhatsApp (async — untuk FastAPI / asyncio).

        Args:
            to: Nomor tujuan format internasional tanpa ``+``.
            body: Teks pesan bebas.
            template_code: Kode template ter-approve.
            variables: Variabel template.

        Returns:
            Dict berisi ``messageId`` dan ``status``.
        """
        payload = self._build_payload(to, body, template_code, variables)
        response = await self._async_http.post(_ENDPOINT, payload)
        return response.get("data", response)

    @staticmethod
    def _build_payload(
        to: str,
        body: str | None,
        template_code: str | None,
        variables: dict[str, str] | None,
    ) -> dict[str, Any]:
        if not body and not template_code:
            raise ValueError("Salah satu dari 'body' atau 'template_code' wajib diisi")
        payload: dict[str, Any] = {"channel": "WHATSAPP", "recipient": to}
        if body:
            payload["body"] = body
        if template_code:
            payload["templateCode"] = template_code
        if variables:
            payload["variables"] = variables
        return payload
