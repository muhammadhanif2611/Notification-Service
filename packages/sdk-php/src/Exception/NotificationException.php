<?php

declare(strict_types=1);

namespace NotificationGateway\Exception;

/**
 * Base exception untuk semua error dari Notification Gateway SDK.
 */
class NotificationException extends \RuntimeException
{
    public function __construct(
        string $message,
        private readonly ?int $statusCode = null,
        private readonly ?string $errorCode = null,
        \Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    /** Mengembalikan HTTP status code jika tersedia. */
    public function getStatusCode(): ?int
    {
        return $this->statusCode;
    }

    /** Mengembalikan kode error dari API jika tersedia. */
    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }
}
