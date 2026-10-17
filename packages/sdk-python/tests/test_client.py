import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from notification_gateway import NotificationClient, AuthenticationError, RateLimitError
from notification_gateway.http import _DEFAULT_BASE_URL


def response(status, body):
    result = MagicMock()
    result.status_code = status
    result.ok = result.is_success = status < 400
    result.content = b'json'
    result.json.return_value = body
    return result


class ClientTests(unittest.TestCase):
    def test_production_default_and_ping(self):
        client = NotificationClient('ngw_sand_test')
        self.assertEqual(client._http.base_url, 'https://gateway-service-production-9201.up.railway.app')
        body = {'success': True, 'data': {'status': 'connected'}}
        with patch('requests.request', return_value=response(200, body)) as request:
            self.assertEqual(client.ping(), body)
            request.assert_called_once_with('GET', _DEFAULT_BASE_URL + '/v1/notifications/ping', json=None,
                                           headers={'Content-Type': 'application/json', 'x-api-key': 'ngw_sand_test'}, timeout=10.0)

    def test_authentication_error_keeps_message_and_code_without_retry(self):
        client = NotificationClient('invalid')
        with patch('requests.request', return_value=response(401, {'error': {'message': 'Invalid key', 'code': 'UNAUTHORIZED'}})) as request:
            with self.assertRaises(AuthenticationError) as error:
                client.ping()
            self.assertEqual(str(error.exception), 'Invalid key')
            self.assertEqual(error.exception.code, 'UNAUTHORIZED')
            self.assertEqual(error.exception.status_code, 401)
            self.assertEqual(request.call_count, 1)

    def test_rate_limit_keeps_exception_type_after_retries(self):
        client = NotificationClient('key', max_retries=1)
        with patch('requests.request', return_value=response(429, {'error': {'message': 'Quota', 'code': 'DAILY_QUOTA_EXCEEDED'}})) as request, patch('time.sleep'):
            with self.assertRaises(RateLimitError) as error:
                client.ping()
            self.assertEqual(error.exception.code, 'DAILY_QUOTA_EXCEEDED')
            self.assertEqual(request.call_count, 2)

    def test_template_email_omits_optional_body(self):
        client = NotificationClient('key', base_url='http://localhost:3001/')
        with patch('requests.request', return_value=response(202, {'success': True, 'data': {'status': 'QUEUED'}})) as request:
            self.assertEqual(client.email.send(to='test@example.com', template_code='welcome'), {'status': 'QUEUED'})
            self.assertEqual(request.call_args.kwargs['json'], {'channel': 'EMAIL', 'recipient': 'test@example.com', 'templateCode': 'welcome'})
            self.assertEqual(request.call_args.args[1], 'http://localhost:3001/v1/notifications/send')


class AsyncClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_async_ping_and_nested_error(self):
        client = NotificationClient('key')
        transport = AsyncMock()
        transport.request.return_value = response(200, {'success': True, 'data': {'status': 'connected'}})
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=transport)
        context.__aexit__ = AsyncMock(return_value=False)
        with patch('httpx.AsyncClient', return_value=context):
            self.assertEqual((await client.test_connection_async())['data']['status'], 'connected')
            self.assertEqual(transport.request.call_args.args, ('GET', _DEFAULT_BASE_URL + '/v1/notifications/ping'))
            transport.request.return_value = response(401, {'error': {'message': 'Invalid key', 'code': 'UNAUTHORIZED'}})
            with self.assertRaises(AuthenticationError) as error:
                await client.ping_async()
            self.assertEqual(error.exception.code, 'UNAUTHORIZED')


if __name__ == '__main__':
    unittest.main()
