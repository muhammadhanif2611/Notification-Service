<?php

declare(strict_types=1);

namespace NotificationGateway\Channel;

use NotificationGateway\Http\HttpClient;

/**
 * Client untuk broadcast pesan ke banyak penerima sekaligus.
 *
 * Diakses via ``$client->broadcast``.
 */
final class BroadcastClient
{
    private const ENDPOINT = '/v1/notifications/broadcast';

    public function __construct(private readonly HttpClient $http) {}

    /**
     * Broadcast pesan ke banyak penerima.
     *
     * @param  string                            $channel            ``'WHATSAPP'`` atau ``'EMAIL'``.
     * @param  string[]                          $recipients         Daftar nomor/email penerima.
     * @param  string|null                       $body               Teks pesan.
     * @param  string|null                       $subject            Subject email (wajib jika channel EMAIL).
     * @param  string|null                       $templateCode       Kode template ter-approve.
     * @param  array<string,string>              $variables          Variabel global untuk semua penerima.
     * @param  array<string,array<string,string>> $recipientVariables Variabel personal per penerima.
     * @return array<string, mixed>              Array berisi ``broadcastId`` dan ``totalQueued``.
     *
     * @throws \InvalidArgumentException                             Jika ``recipients`` kosong.
     * @throws \NotificationGateway\Exception\NotificationException  Jika request gagal.
     */
    public function send(
        string $channel,
        array $recipients,
        ?string $body = null,
        ?string $subject = null,
        ?string $templateCode = null,
        array $variables = [],
        array $recipientVariables = [],
    ): array {
        if (empty($recipients)) {
            throw new \InvalidArgumentException("'recipients' tidak boleh kosong.");
        }

        $payload = [
            'channel'    => strtoupper($channel),
            'recipients' => $recipients,
        ];

        if ($body !== null) {
            $payload['body'] = $body;
        }
        if ($subject !== null) {
            $payload['subject'] = $subject;
        }
        if ($templateCode !== null) {
            $payload['templateCode'] = $templateCode;
        }
        if (!empty($variables)) {
            $payload['variables'] = $variables;
        }
        if (!empty($recipientVariables)) {
            $payload['recipientVariables'] = $recipientVariables;
        }

        $response = $this->http->post(self::ENDPOINT, $payload);
        return $response['data'] ?? $response;
    }
}
