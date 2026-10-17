<?php

declare(strict_types=1);

namespace NotificationGateway;

use NotificationGateway\Channel\BroadcastClient;
use NotificationGateway\Channel\EmailClient;
use NotificationGateway\Channel\WhatsAppClient;
use NotificationGateway\Http\HttpClient;
use NotificationGateway\Webhook\WebhookVerifier;

/**
 * Client utama Notification Gateway SDK.
 *
 * Menyediakan akses ke semua channel pengiriman dan verifikasi webhook.
 *
 * @example
 * ```php
 * use NotificationGateway\NotificationClient;
 *
 * $client = new NotificationClient(
 *     apiKey: 'ngw_prod_xxxxxxxxxxxxxxxx',
 *     baseUrl: 'https://gateway-service-production-9201.up.railway.app',
 * );
 *
 * // Kirim WhatsApp
 * $result = $client->whatsapp->send(to: '6281234567890', body: 'Halo!');
 *
 * // Kirim Email
 * $result = $client->email->send(
 *     to: 'budi@perusahaan.com',
 *     subject: 'Konfirmasi Pembayaran',
 *     body: '<h1>Terima kasih!</h1>',
 * );
 *
 * // Broadcast
 * $result = $client->broadcast->send(
 *     channel: 'WHATSAPP',
 *     recipients: ['6281234567890', '6281234567891'],
 *     templateCode: 'pengumuman_hrd',
 *     variables: ['periode' => 'Q3 2026'],
 * );
 *
 * // Verifikasi webhook
 * $rawBody = file_get_contents('php://input');
 * $event = $client->webhooks->verify(
 *     rawBody: $rawBody,
 *     headers: getallheaders(),
 *     secret: $_ENV['NGW_WEBHOOK_SECRET'],
 * );
 * ```
 */
final class NotificationClient
{
    /** Client WhatsApp — `$client->whatsapp->send(...)` */
    public readonly WhatsAppClient $whatsapp;

    /** Client Email — `$client->email->send(...)` */
    public readonly EmailClient $email;

    /** Client Broadcast — `$client->broadcast->send(...)` */
    public readonly BroadcastClient $broadcast;

    /** Verifier Webhook — `$client->webhooks->verify(...)` */
    public readonly WebhookVerifier $webhooks;

    private readonly HttpClient $http;

    /**
     * @param string $apiKey     API Key dari dashboard (``ngw_prod_...`` atau ``ngw_sand_...``).
     * @param string $baseUrl    URL base Gateway API.
     * @param float  $timeout    Timeout request dalam detik. Default: 10.0.
     * @param int    $maxRetries Jumlah retry untuk error 5xx/jaringan. Default: 2.
     *
     * @throws \InvalidArgumentException Jika ``apiKey`` kosong.
     */
    public function __construct(
        string $apiKey,
        string $baseUrl = 'https://gateway-service-production-9201.up.railway.app',
        float $timeout = 10.0,
        int $maxRetries = 2,
    ) {
        if (trim($apiKey) === '') {
            throw new \InvalidArgumentException("'apiKey' wajib diisi untuk menginisialisasi NotificationClient.");
        }

        $http = new HttpClient($apiKey, $baseUrl, $timeout, $maxRetries);
        $this->http = $http;

        $this->whatsapp  = new WhatsAppClient($http);
        $this->email     = new EmailClient($http);
        $this->broadcast = new BroadcastClient($http);
        $this->webhooks  = new WebhookVerifier();
    }
    public function ping(): array
    {
        return $this->http->get('/v1/notifications/ping');
    }

    public function testConnection(): array
    {
        return $this->ping();
    }
}
