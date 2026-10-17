"""
HTTP Client internal untuk Notification Gateway SDK.

Mendukung sync (via requests) dan async (via httpx) dengan retry exponential backoff.
"""

from __future__ import annotations

import time
from typing import Any

from notification_gateway.exceptions import AuthenticationError, NotificationError, RateLimitError

_DEFAULT_BASE_URL = "https://gateway-service-production-9201.up.railway.app"
_DEFAULT_TIMEOUT = 10.0
_DEFAULT_MAX_RETRIES = 2
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _build_headers(api_key: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }


def _response_error(status_code: int, body: dict[str, Any]) -> NotificationError:
    error = body.get("error")
    message = error.get("message") if isinstance(error, dict) else error
    code = error.get("code") if isinstance(error, dict) else None
    exception = AuthenticationError if status_code == 401 else RateLimitError if status_code == 429 else NotificationError
    return exception(message or f"Request gagal dengan status {status_code}", status_code=status_code, code=code)


def _raise_for_response(status_code: int, body: dict[str, Any]) -> None:
    raise _response_error(status_code, body)


class HttpClient:
    """
    HTTP Client sync untuk Notification Gateway.

    Digunakan oleh channel client (WhatsApp, Email, Broadcast).
    Mendukung retry otomatis dengan exponential backoff untuk error jaringan dan 5xx.

    Args:
        api_key: API Key dari dashboard (``ngw_prod_...`` atau ``ngw_sand_...``).
        base_url: URL Gateway API. Default: ``https://gateway-service-production-9201.up.railway.app``.
        timeout: Timeout request dalam detik. Default: ``10.0``.
        max_retries: Jumlah percobaan ulang. Default: ``2``.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        max_retries: int = _DEFAULT_MAX_RETRIES,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    def get(self, path: str) -> dict[str, Any]:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", path, payload)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Mengirim POST request ke Gateway API (sync).

        Args:
            path: Path endpoint relatif, mis. ``/v1/notifications/send``.
            payload: Body JSON sebagai dict.

        Returns:
            Response body sebagai dict.

        Raises:
            AuthenticationError: API Key tidak valid (HTTP 401).
            RateLimitError: Rate limit tercapai (HTTP 429).
            NotificationError: Error lainnya dari server atau jaringan.
        """
        import requests  # lazy import agar tidak wajib install jika hanya pakai async

        last_error: Exception | None = None
        url = f"{self.base_url}{path}"
        headers = _build_headers(self.api_key)

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.request(method, url, json=payload, headers=headers, timeout=self.timeout)
                body: dict[str, Any] = response.json() if response.content else {}

                if not response.ok:
                    if response.status_code not in _RETRYABLE_STATUS_CODES:
                        _raise_for_response(response.status_code, body)
                    last_error = _response_error(response.status_code, body)
                else:
                    return body

            except (AuthenticationError, NotificationError) as exc:
                if isinstance(exc, (AuthenticationError,)) or (
                    hasattr(exc, "status_code") and exc.status_code not in _RETRYABLE_STATUS_CODES
                ):
                    raise
                last_error = exc
            except Exception as exc:
                last_error = NotificationError(str(exc))

            if attempt < self.max_retries:
                time.sleep(0.5 * (2 ** attempt))

        raise last_error or NotificationError("Request gagal setelah semua percobaan ulang")


class AsyncHttpClient:
    """
    HTTP Client async untuk Notification Gateway (httpx).

    Digunakan oleh channel client versi ``*_async()``.
    Mendukung retry otomatis dengan exponential backoff.

    Args:
        api_key: API Key dari dashboard.
        base_url: URL Gateway API. Default: ``https://gateway-service-production-9201.up.railway.app``.
        timeout: Timeout request dalam detik. Default: ``10.0``.
        max_retries: Jumlah percobaan ulang. Default: ``2``.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        max_retries: int = _DEFAULT_MAX_RETRIES,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    async def get(self, path: str) -> dict[str, Any]:
        return await self._request("GET", path)

    async def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", path, payload)

    async def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Mengirim POST request ke Gateway API (async).

        Args:
            path: Path endpoint relatif.
            payload: Body JSON sebagai dict.

        Returns:
            Response body sebagai dict.

        Raises:
            AuthenticationError: API Key tidak valid (HTTP 401).
            RateLimitError: Rate limit tercapai (HTTP 429).
            NotificationError: Error lainnya.
        """
        import asyncio

        import httpx  # lazy import

        last_error: Exception | None = None
        url = f"{self.base_url}{path}"
        headers = _build_headers(self.api_key)

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.request(method, url, json=payload, headers=headers)
                    body: dict[str, Any] = response.json() if response.content else {}

                    if not response.is_success:
                        if response.status_code not in _RETRYABLE_STATUS_CODES:
                            _raise_for_response(response.status_code, body)
                        last_error = _response_error(response.status_code, body)
                    else:
                        return body

            except (AuthenticationError, NotificationError) as exc:
                if isinstance(exc, AuthenticationError) or (
                    hasattr(exc, "status_code") and exc.status_code not in _RETRYABLE_STATUS_CODES
                ):
                    raise
                last_error = exc
            except Exception as exc:
                last_error = NotificationError(str(exc))

            if attempt < self.max_retries:
                await asyncio.sleep(0.5 * (2 ** attempt))

        raise last_error or NotificationError("Request gagal setelah semua percobaan ulang")
