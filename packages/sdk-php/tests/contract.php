<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use NotificationGateway\Channel\EmailClient;
use NotificationGateway\Exception\AuthenticationException;
use NotificationGateway\Exception\RateLimitException;
use NotificationGateway\Http\HttpClient;
use NotificationGateway\NotificationClient;

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$history = [];
$mock = new MockHandler([
    new Response(200, [], '{"success":true,"data":{"status":"connected"}}'),
    new Response(202, [], '{"success":true,"data":{"status":"QUEUED"}}'),
    new Response(401, [], '{"error":{"code":"UNAUTHORIZED","message":"Invalid key"}}'),
    new Response(429, [], '{"error":{"code":"DAILY_QUOTA_EXCEEDED","message":"Quota"}}'),
    new Response(429, [], '{"error":{"code":"DAILY_QUOTA_EXCEEDED","message":"Quota"}}'),
]);
$stack = HandlerStack::create($mock);
$stack->push(Middleware::history($history));
$guzzle = new Client(['base_uri' => 'https://gateway-service-production-9201.up.railway.app/', 'handler' => $stack, 'headers' => ['x-api-key' => 'ngw_sand_test']]);
$http = new HttpClient('ngw_sand_test', 'https://gateway-service-production-9201.up.railway.app', maxRetries: 1, client: $guzzle);
check($http->get('/v1/notifications/ping')['data']['status'] === 'connected', 'Ping response');
$email = new EmailClient($http);
check($email->send(to: 'test@example.com', templateCode: 'welcome')['status'] === 'QUEUED', 'Template email response');
check($history[0]['request']->getMethod() === 'GET', 'Ping uses GET');
check($history[0]['request']->getUri()->getPath() === '/v1/notifications/ping', 'Ping path');
check($history[0]['request']->getHeaderLine('x-api-key') === 'ngw_sand_test', 'API key header');
$payload = json_decode((string) $history[1]['request']->getBody(), true);
check($payload === ['channel' => 'EMAIL', 'recipient' => 'test@example.com', 'templateCode' => 'welcome'], 'Template email payload');

try {
    $http->get('/v1/notifications/ping');
    throw new RuntimeException('Expected authentication exception');
} catch (AuthenticationException $error) {
    check($error->getMessage() === 'Invalid key', 'Nested error message');
    check($error->getErrorCode() === 'UNAUTHORIZED', 'Nested error code');
    check($error->getStatusCode() === 401, 'Authentication status');
    check(count($history) === 3, 'Authentication failures are not retried');
}

try {
    $http->get('/v1/notifications/ping');
    throw new RuntimeException('Expected rate limit exception');
} catch (RateLimitException $error) {
    check($error->getErrorCode() === 'DAILY_QUOTA_EXCEEDED', 'Rate limit code');
    check(count($history) === 5, 'Rate limit retry count');
}

$constructor = new ReflectionMethod(NotificationClient::class, '__construct');
check($constructor->getParameters()[1]->getDefaultValue() === 'https://gateway-service-production-9201.up.railway.app', 'Production default URL');
check(method_exists(NotificationClient::class, 'ping') && method_exists(NotificationClient::class, 'testConnection'), 'Handshake methods');
echo "PHP SDK contract checks passed\n";
