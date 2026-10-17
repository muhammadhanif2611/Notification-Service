"""
Exceptions untuk Notification Gateway SDK.
"""


from __future__ import annotations


class NotificationError(Exception):
    """Base exception untuk semua error dari Notification Gateway SDK."""

    def __init__(self, message: str, status_code: int | None = None, code: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={str(self)!r}, status_code={self.status_code!r})"


class AuthenticationError(NotificationError):
    """Dilempar saat API Key tidak valid atau tidak aktif (HTTP 401)."""


class RateLimitError(NotificationError):
    """Dilempar saat rate limit atau kuota habis (HTTP 429)."""


class WebhookVerificationError(NotificationError):
    """Dilempar saat verifikasi signature webhook gagal."""
