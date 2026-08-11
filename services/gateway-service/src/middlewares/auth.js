import { verifyApiKey, verifyAuthToken, createLogger } from '@notification-gateway/shared';
import * as apiKeyRepository from '../repositories/apiKeyRepository.js';

const logger = createLogger('gateway-service');

// Middleware: autentikasi via API Key
export async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'Header x-api-key is required.' } });
  }

  try {
    const keyPrefix = apiKey.startsWith('ngw_prod_') ? 'ngw_prod_' : apiKey.startsWith('ngw_sand_') ? 'ngw_sand_' : null;
    if (!keyPrefix) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_API_KEY_FORMAT', message: 'API Key must start with ngw_prod_ or ngw_sand_' } });
    }

    const keys = await apiKeyRepository.findActiveByPrefix(keyPrefix);
    if (!keys?.length) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or inactive API Key.' } });
    }

    let matchedKey = null;
    for (const keyRecord of keys) {
      if (await verifyApiKey(apiKey, keyRecord.key_hash)) {
        matchedKey = keyRecord;
        break;
      }
    }

    if (!matchedKey?.projects?.is_active) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API Key or associated project is inactive.' } });
    }

    req.project = matchedKey.projects;
    req.apiKeyRecord = matchedKey;
    req.environment = matchedKey.environment;

    // Update last_used_at secara async
    apiKeyRepository.updateLastUsed(matchedKey.id);

    next();
  } catch (err) {
    logger.error({ err: err.message }, 'API Key authentication failed');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to authenticate API key.' } });
  }
}

// Middleware: autentikasi via JWT Bearer token
export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Authorization Bearer token is required.' } });
  }

  const decoded = verifyAuthToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' } });
  }

  req.user = decoded;
  next();
}

// Middleware: cek role user
export function roleCheck(allowedRoles = ['admin']) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access forbidden: Insufficient permissions.' } });
    }
    next();
  };
}
