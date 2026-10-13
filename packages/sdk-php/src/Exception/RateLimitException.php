<?php

declare(strict_types=1);

namespace NotificationGateway\Exception;

/** Dilempar saat rate limit atau kuota habis (HTTP 429). */
class RateLimitException extends NotificationException {}
