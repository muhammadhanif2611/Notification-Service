<?php

declare(strict_types=1);

namespace NotificationGateway\Channel;

use NotificationGateway\Http\HttpClient;

/**
 * Client untuk mengirim pesan WhatsApp melalui Notification Gateway.
 *
 * Diakses via ``$client->whatsapp``.
 */
final class WhatsAppClient
{
    private const ENDPOINT = '/v1/notifications/send';

    public function __construct(private readonly HttpClient $http) {}

    /**
     * Mengirim pesan WhatsApp.
     *
     * @param  string               $to           Nomor tujuan format internasional tanpa ``+``, mis. ``6281234567890``.
     * @param  string|null          $body         Teks pesan bebas. Wajib jika tidak pakai ``$templateCode``.
     * @param  string|null          $templateCode Kode template ter-approve di dashboard.
     * @param  array<string,string> $variables    Variabel template, mis. ``['nama' => 'Budi', 'otp' => '1234']``.
     * @return array<string, mixed> Array berisi ``messageId`` dan ``status``.
     *
     * @throws \InvalidArgumentException               Jika ``body`` dan ``templateCode`` keduanya kosong.
     * @throws \NotificationGateway\Exception\NotificationException Jika request gagal.
     */
    public function send(
        string $to,
        ?string $body = null,
        ?string $templateCode = null,
        array $variables = [],
    ): array {
        if ($body === null && $templateCode === null) {
            throw new \InvalidArgumentException("Salah satu dari 'body' atau 'templateCode' wajib diisi.");
        }

        $payload = ['channel' => 'WHATSAPP', 'recipient' => $to];

        if ($body !== null) {
            $payload['body'] = $body;
        }
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
