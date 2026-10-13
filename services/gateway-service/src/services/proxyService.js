import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('gateway-service:proxy');

// Timeout standar untuk panggilan proxy internal microservice (10 detik)
const PROXY_TIMEOUT_MS = 10000;

/**
 * Meneruskan request HTTP dari Gateway ke microservice tujuan.
 * Menjamin headers auth, user info, dan query parameters di-forward dengan benar.
 * Dilengkapi dengan AbortSignal.timeout untuk mencegah request menggantung tanpa batas.
 *
 * @param {string} targetUrl - URL endpoint microservice tujuan
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @returns {Promise<import('express').Response>}
 */
export async function forwardProxyRequest(targetUrl, req, res) {
  try {
    let url = targetUrl;
    if (req.method === 'GET' || req.method === 'HEAD') {
      const queryString = new URLSearchParams(req.query).toString();
      if (queryString) url += `?${queryString}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
      ...(req.headers['x-api-key'] ? { 'x-api-key': req.headers['x-api-key'] } : {}),
      // Forward user & project context
      ...(req.user ? { 'x-user-id': req.user.userId, 'x-user-role': req.user.role } : {}),
      ...(req.project ? { 'x-project-id': req.project.id } : {}),
      ...(req.environment ? { 'x-environment': req.environment } : {})
    };

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody && req.body ? JSON.stringify(req.body) : undefined;

    const response = await fetch(url, {
      method: req.method,
      headers,
      ...(hasBody ? { body } : {}),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS)
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      logger.error({ targetUrl, method: req.method }, 'Proxy request timed out after 10s');
      return res.status(504).json({
        success: false,
        error: { code: 'GATEWAY_TIMEOUT', message: 'Target microservice request timed out' }
      });
    }

    logger.error({ targetUrl, err: err.message }, 'Proxy request failed');
    return res.status(502).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Target microservice unavailable or unreachable' }
    });
  }
}
