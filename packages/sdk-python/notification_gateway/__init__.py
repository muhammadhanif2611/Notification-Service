"""
Notification Gateway Python SDK.

Kirim WhatsApp, Email, dan Broadcast notifikasi dari aplikasi Python Anda.
Mendukung async (httpx) untuk FastAPI dan sync (requests) untuk Flask/Django.

Penggunaan dasar::

    from notification_gateway import NotificationClient

    client = NotificationClient(api_key="ngw_prod_xxx")
    client.whatsapp.send(to="6281234567890", body="Halo!")
"""

from notification_gateway.client import NotificationClient
from notification_gateway.exceptions import (
    NotificationError,
    AuthenticationError,
    RateLimitError,
)
from notification_gateway.webhook import verify_webhook

__all__ = [
    "NotificationClient",
    "NotificationError",
    "AuthenticationError",
    "RateLimitError",
    "verify_webhook",
]

__version__ = "1.0.1"
