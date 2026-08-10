import express from 'express';
import { supabase } from '@notification-gateway/database';
import {
  generateRawApiKey,
  hashApiKey,
  extractKeyPreview,
  verifyApiKey,
  generateAuthToken,
  createProjectSchema,
  createApiKeySchema,
  createLogger
} from '@notification-gateway/shared';

const logger = createLogger('gateway-service');
const router = express.Router();

// POST /v1/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isValid = await verifyApiKey(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateAuthToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    await supabase.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    return res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    logger.error({ err: err.message }, 'Admin login failed');
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// GET /v1/admin/projects
router.get('/projects', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /v1/admin/projects
router.post('/projects', async (req, res) => {
  const parse = createProjectSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.errors });
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: parse.data.name,
        slug: parse.data.slug,
        description: parse.data.description,
        rate_limit_per_min: parse.data.rateLimitPerMin,
        daily_quota: parse.data.dailyQuota,
        webhook_url: parse.data.webhookUrl,
        webhook_secret: parse.data.webhookSecret
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /v1/admin/api-keys
router.post('/api-keys', async (req, res) => {
  const parse = createApiKeySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.errors });
  }

  try {
    const { data: project } = await supabase.from('projects').select('slug').eq('id', parse.data.projectId).single();
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const envPrefix = parse.data.environment === 'production' ? 'prod' : 'sand';
    const rawKey = generateRawApiKey(envPrefix, project.slug);
    const keyHash = await hashApiKey(rawKey);
    const keyPreview = extractKeyPreview(rawKey);
    const keyPrefix = envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_';

    const { data, error } = await supabase
      .from('api_keys')
      .insert({ project_id: parse.data.projectId, name: parse.data.name, key_prefix: keyPrefix, key_hash: keyHash, key_preview: keyPreview, environment: parse.data.environment })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, rawApiKey: rawKey, apiKeyInfo: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
