"""
Broadcast channel client untuk pengiriman massal.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from notification_gateway.http import AsyncHttpClient, HttpClient

_ENDPOINT = "/v1/notifications/broadcast"


class BroadcastClient:
    """
    Client untuk broadcast pesan ke banyak penerima sekaligus.

    Diakses via ``client.broadcast``.
    """

    def __init__(self, http: "HttpClient", async_http: "AsyncHttpClient") -> None:
        self._http = http
        self._async_http = async_http

    def send(
        self,
        channel: str,
        recipients: list[str],
        body: str | None = None,
        subject: str | None = None,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
        recipient_variables: dict[str, dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Broadcast pesan ke banyak penerima (sync).

        Args:
            channel: ``"WHATSAPP"`` atau ``"EMAIL"``.
            recipients: Daftar nomor/email penerima.
            body: Teks pesan (untuk WhatsApp, atau Email teks biasa).
            subject: Subject email (wajib jika ``channel="EMAIL"``).
            template_code: Kode template ter-approve.
            variables: Variabel global untuk semua penerima.
            recipient_variables: Variabel personal per penerima,
                mis. ``{"6281234567890": {"nama": "Budi"}}``.

        Returns:
            Dict berisi ``broadcastId`` dan ``totalQueued``.

        Raises:
            NotificationError: Jika request gagal.
        """
        payload = self._build_payload(
            channel, recipients, body, subject, template_code, variables, recipient_variables
        )
        response = self._http.post(_ENDPOINT, payload)
        return response.get("data", response)

    async def send_async(
        self,
        channel: str,
        recipients: list[str],
        body: str | None = None,
        subject: str | None = None,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
        recipient_variables: dict[str, dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Broadcast pesan ke banyak penerima (async — untuk FastAPI / asyncio).

        Args:
            channel: ``"WHATSAPP"`` atau ``"EMAIL"``.
            recipients: Daftar nomor/email penerima.
            body: Teks pesan.
            subject: Subject email.
            template_code: Kode template.
            variables: Variabel global.
            recipient_variables: Variabel personal per penerima.

        Returns:
            Dict berisi ``broadcastId`` dan ``totalQueued``.
        """
        payload = self._build_payload(
            channel, recipients, body, subject, template_code, variables, recipient_variables
        )
        response = await self._async_http.post(_ENDPOINT, payload)
        return response.get("data", response)

    @staticmethod
    def _build_payload(
        channel: str,
        recipients: list[str],
        body: str | None,
        subject: str | None,
        template_code: str | None,
        variables: dict[str, str] | None,
        recipient_variables: dict[str, dict[str, str]] | None,
    ) -> dict[str, Any]:
        if not recipients:
            raise ValueError("'recipients' tidak boleh kosong")
        payload: dict[str, Any] = {"channel": channel.upper(), "recipients": recipients}
        if body:
            payload["body"] = body
        if subject:
            payload["subject"] = subject
        if template_code:
            payload["templateCode"] = template_code
        if variables:
            payload["variables"] = variables
        if recipient_variables:
            payload["recipientVariables"] = recipient_variables
        return payload
