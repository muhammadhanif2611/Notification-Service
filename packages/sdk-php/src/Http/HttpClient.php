<?php

declare(strict_types=1);

namespace NotificationGateway\Http;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ServerException;
use GuzzleHttp\Exception\TransferException;
use NotificationGateway\Exception\AuthenticationException;
use NotificationGateway\Exception\NotificationException;
use NotificationGateway\Exception\RateLimitException;

/**
 * HTTP Client internal yang mem-wrapping Guzzle dengan auth, retry, dan error handling.
 */
final class HttpClient
{
    private const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

    private readonly Client $guzzle;

    /**
     * @param string $apiKey     API Key dari dashboard.
     * @param string $baseUrl    URL base Gateway API.
     * @param float  $timeout    Timeout request dalam detik.
     * @param int    $maxRetries Jumlah percobaan ulang untuk error 5xx/jaringan.
     */
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly float $timeout = 10.0,
        private readonly int $maxRetries = 2,
        ?Client $client = null,
    ) {
        $this->guzzle = $client ?? new Client([
            'base_uri' => rtrim($baseUrl, '/') . '/',
            'timeout'  => $timeout,
            'headers'  => [
                'Content-Type' => 'application/json',
                'x-api-key'    => $apiKey,
            ],
        ]);
    }

    /**
     * Mengirim POST request ke endpoint Gateway.
     *
     * @param  string               $path    Path endpoint relatif, mis. ``/v1/notifications/send``.
     * @param  array<string, mixed> $payload Body JSON.
     * @return array<string, mixed>
     *
     * @throws AuthenticationException Jika API Key tidak valid (HTTP 401).
     * @throws RateLimitException      Jika rate limit tercapai (HTTP 429).
     * @throws NotificationException   Untuk error lainnya.
     */
    public function post(string $path, array $payload): array
    {
        return $this->request('POST', $path, $payload);
    }

    public function get(string $path): array
    {
        return $this->request('GET', $path);
    }

    private function request(string $method, string $path, ?array $payload = null): array
    {
        $lastException = null;

        for ($attempt = 0; $attempt <= $this->maxRetries; $attempt++) {
            try {
                $response = $this->guzzle->request($method, ltrim($path, '/'), $payload === null ? [] : ['json' => $payload]);
                $body = json_decode((string) $response->getBody(), true) ?? [];
                return $body;

            } catch (ClientException $e) {
                $statusCode = $e->getResponse()->getStatusCode();
                $body = json_decode((string) $e->getResponse()->getBody(), true) ?? [];
                $error = $body['error'] ?? null;
                $message = (is_array($error) ? ($error['message'] ?? null) : $error) ?? "Request gagal dengan status {$statusCode}";
                $errorCode = is_array($error) ? ($error['code'] ?? null) : null;

                if ($statusCode === 401) {
                    throw new AuthenticationException($message, $statusCode, $errorCode, previous: $e);
                }
                if ($statusCode === 429) {
                    $lastException = new RateLimitException($message, $statusCode, $errorCode, previous: $e);
                } else {
                    // Error 4xx lainnya — tidak di-retry
                    throw new NotificationException($message, $statusCode, $errorCode, previous: $e);
                }

            } catch (ServerException $e) {
                $statusCode = $e->getResponse()->getStatusCode();
                $body = json_decode((string) $e->getResponse()->getBody(), true) ?? [];
                $error = $body['error'] ?? null;
                $message = (is_array($error) ? ($error['message'] ?? null) : $error) ?? "Request gagal dengan status {$statusCode}";
                $errorCode = is_array($error) ? ($error['code'] ?? null) : null;
                $lastException = new NotificationException($message, $statusCode, $errorCode, previous: $e);

            } catch (TransferException $e) {
                $lastException = new NotificationException($e->getMessage(), previous: $e);
            }

            if ($attempt < $this->maxRetries) {
                $backoffMs = (int) (500 * (2 ** $attempt));
                usleep($backoffMs * 1000);
            }
        }

        throw $lastException ?? new NotificationException('Request gagal setelah semua percobaan ulang');
    }
}
