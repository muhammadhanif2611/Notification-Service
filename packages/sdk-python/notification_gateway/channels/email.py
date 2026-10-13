"""
Email channel client.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from notification_gateway.http import AsyncHttpClient, HttpClient

_ENDPOINT = "/v1/notifications/send"


class EmailClient:
    """
    Client untuk mengirim email melalui Notification Gateway.

    Diakses via ``client.email``.
    """

    def __init__(self, http: "HttpClient", async_http: "AsyncHttpClient") -> None:
        self._http = http
        self._async_http = async_http

    def send(
        self,
        to: str,
        subject: str,
        body: str,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Mengirim email (sync).

        Args:
            to: Alamat email tujuan, mis. ``budi@perusahaan.com``.
            subject: Subject email.
            body: Konten HTML atau teks email.
            template_code: Kode template email ter-approve (opsional).
            variables: Variabel untuk template (opsional).

        Returns:
            Dict berisi ``messageId`` dan ``status`` (``QUEUED``).

        Raises:
            NotificationError: Jika request gagal.
        """
        payload = self._build_payload(to, subject, body, template_code, variables)
        response = self._http.post(_ENDPOINT, payload)
        return response.get("data", response)

    async def send_async(
        self,
        to: str,
        subject: str,
        body: str,
        template_code: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Mengirim email (async — untuk FastAPI / asyncio).

        Args:
            to: Alamat email tujuan.
            subject: Subject email.
            body: Konten HTML atau teks.
            template_code: Kode template (opsional).
            variables: Variabel template (opsional).

        Returns:
            Dict berisi ``messageId`` dan ``status``.
        """
        payload = self._build_payload(to, subject, body, template_code, variables)
        response = await self._async_http.post(_ENDPOINT, payload)
        return response.get("data", response)

    @staticmethod
    def _build_payload(
        to: str,
        subject: str,
        body: str,
        template_code: str | None,
        variables: dict[str, str] | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "channel": "EMAIL",
            "recipient": to,
            "subject": subject,
            "body": body,
        }
        if template_code:
            payload["templateCode"] = template_code
        if variables:
            payload["variables"] = variables
        return payload
