<?php

declare(strict_types=1);

namespace NotificationGateway\Webhook;

use NotificationGateway\Exception\WebhookVerificationException;

/**
 * Verifikasi signature webhook dari Notification Gateway.
 *
 * Mengimplementasikan algoritma Svix/Resend:
 *   ``v1,base64(HMAC_SHA256("id.timestamp.rawBody", decoded_secret))``
 *
 * Secret format: ``whsec_<base64bytes>`` — bagian base64 di-decode dulu
 * sebelum digunakan sebagai kunci HMAC.
 *
 * Diakses via ``$client->webhooks``.
 */
final class WebhookVerifier
{
    /** Toleransi timestamp dalam detik untuk mencegah replay attack (5 menit). */
    private const DEFAULT_TOLERANCE_SECONDS = 300;

    /**
     * Verifikasi signature webhook dan kembalikan payload ter-parse.
     *
     * @param  string               $rawBody   Raw body HTTP request (JANGAN parse/decode dulu).
     * @param  array<string,string> $headers   Header HTTP request (case-insensitive).
     * @param  string               $secret    Webhook secret dari dashboard (``whsec_...``).
     * @param  int                  $tolerance Toleransi timestamp dalam detik (default 300).
     * @return array<string, mixed> Payload webhook sebagai array PHP.
     *
     * @throws WebhookVerificationException Jika signature tidak valid, timestamp kadaluarsa,
     *                                      atau header tidak lengkap.
     *
     * @example
     * ```php
     * $rawBody = file_get_contents('php://input'); // WAJIB raw body mentah
     * $event = $client->webhooks->verify(
     *     rawBody: $rawBody,
     *     headers: getallheaders(),
     *     secret: $_ENV['NGW_WEBHOOK_SECRET'],
     * );
     * echo $event['data']['messageId'];
     * ```
     */
    public function verify(
        string $rawBody,
        array $headers,
        string $secret,
        int $tolerance = self::DEFAULT_TOLERANCE_SECONDS,
    ): array {
        // Normalisasi header ke lowercase untuk lookup case-insensitive
        $lowerHeaders = array_change_key_case($headers, CASE_LOWER);

        $whId      = $lowerHeaders['webhook-id']        ?? null;
        $timestamp = $lowerHeaders['webhook-timestamp'] ?? null;
        $signature = $lowerHeaders['webhook-signature'] ?? null;

        if ($whId === null || $timestamp === null || $signature === null) {
            throw new WebhookVerificationException(
                "Header webhook tidak lengkap. Pastikan 'webhook-id', 'webhook-timestamp', dan 'webhook-signature' tersedia."
            );
        }

        // 1. Validasi timestamp — mencegah replay attack
        $tsInt = filter_var($timestamp, FILTER_VALIDATE_INT);
        if ($tsInt === false) {
            throw new WebhookVerificationException("Format webhook-timestamp tidak valid.");
        }

        $elapsed = abs(time() - $tsInt);
        if ($elapsed > $tolerance) {
            throw new WebhookVerificationException(
                "Webhook timestamp kadaluarsa ({$elapsed}s > {$tolerance}s toleransi)."
            );
        }

        // 2. Decode secret
        $key = str_starts_with($secret, 'whsec_')
            ? base64_decode(substr($secret, strlen('whsec_')), strict: true)
            : $secret;

        if ($key === false) {
            throw new WebhookVerificationException("Format secret tidak valid (base64 decode gagal).");
        }

        // 3. Hitung expected signature dari raw body — tidak re-serialize JSON
        $signedContent = "{$whId}.{$timestamp}.{$rawBody}";
        $expected = 'v1,' . base64_encode(hash_hmac('sha256', $signedContent, $key, binary: true));

        // 4. Bandingkan dengan timing-safe compare (support multi-signature Svix)
        $isValid = false;
        foreach (explode(' ', $signature) as $sig) {
            $sig = trim($sig);
            if ($sig !== '' && hash_equals($expected, $sig)) {
                $isValid = true;
                break;
            }
        }

        if (!$isValid) {
            throw new WebhookVerificationException("Webhook signature tidak valid.");
        }

        $decoded = json_decode($rawBody, associative: true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookVerificationException("Webhook body bukan JSON valid: " . json_last_error_msg());
        }

        return $decoded;
    }
}
