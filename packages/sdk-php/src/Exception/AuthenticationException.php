<?php

declare(strict_types=1);

namespace NotificationGateway\Exception;

/** Dilempar saat API Key tidak valid atau tidak aktif (HTTP 401). */
class AuthenticationException extends NotificationException {}
