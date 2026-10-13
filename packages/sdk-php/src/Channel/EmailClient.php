<?php

declare(strict_types=1);

namespace NotificationGateway\Channel;

use NotificationGateway\Http\HttpClient;

/**
 * Client untuk mengirim email melalui Notification Gateway.
 *
 * Diakses via ``$client->email``.
 */
final class EmailClient
{
    private const ENDPOINT = '/v1/notifications/send';

    public function __construct(private readonly HttpClient $http) {}

    /**
     * Mengirim email.
     *
     * @param  string               $to           Alamat email tujuan.
     * @param  string               $subject      Subject email.
     * @param  string               $body         Konten HTML atau teks email.
     * @param  string|null          $templateCode Kode template email (opsional).
     * @param  array<string,string> $variables    Variabel untuk template (opsional).
     * @return array<string, mixed> Array berisi ``messageId`` dan ``status``.
     *
     * @throws \NotificationGateway\Exception\NotificationException Jika request gagal.
     */
    public function send(
        string $to,
        string $subject,
        string $body,
        ?string $templateCode = null,
        array $variables = [],
    ): array {
        $payload = [
            'channel'   => 'EMAIL',
            'recipient' => $to,
            'subject'   => $subject,
            'body'      => $body,
        ];

        if ($templateCode !== null) {
            $payload['templateCode'] = $templateCode;
        }
        if (!empty($variables)) {
            $payload['variables'] = $variables;
        }

        $response = $this->http->post(self::ENDPOINT, $payload);
        return $response['data'] ?? $response;
    }
}
