import { supabase } from '@notification-gateway/database';
import { verifyApiKey, verifyAuthToken } from '@notification-gateway/shared';

/**
 * Express Middleware for API Key verification per Project
 */
export async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_API_KEY', message: 'Header x-api-key is required.' }
    });
  }

  try {
    const keyPrefix = apiKey.startsWith('ngw_prod_') ? 'ngw_prod_' : apiKey.startsWith('ngw_sand_') ? 'ngw_sand_' : null;

    if (!keyPrefix) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY_FORMAT', message: 'API Key must start with ngw_prod_ or ngw_sand_' }
      });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*, projects(*)')
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true);

    if (error || !keys || keys.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or inactive API Key.' }
      });
    }

    let matchedKeyRecord = null;
    for (const keyRecord of keys) {
      const isMatch = await verifyApiKey(apiKey, keyRecord.key_hash);
      if (isMatch) {
        matchedKeyRecord = keyRecord;
        break;
      }
    }

    if (!matchedKeyRecord || !matchedKeyRecord.projects || !matchedKeyRecord.projects.is_active) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid API Key or associated project is inactive.' }
      });
    }

    req.project = matchedKeyRecord.projects;
    req.apiKeyRecord = matchedKeyRecord;
    req.environment = matchedKeyRecord.environment;

    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', matchedKeyRecord.id)
      .then();

    next();
  } catch (err) {
    console.error('API Key Auth error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to authenticate API key.' }
    });
  }
}

/**
 * Express Middleware for Custom JWT Session Authentication (Admin Portal)
 */
export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Authorization Bearer token is required.' }
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAuthToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' }
    });
  }

  req.user = decoded;
  next();
}

/**
 * Express Middleware for Role-Based Access Control ('admin' vs 'user')
 * @param {('admin'|'user')[]} allowedRoles 
 */
export function roleCheck(allowedRoles = ['admin']) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access forbidden: Insufficient permissions.' }
      });
    }
    next();
  };
}
