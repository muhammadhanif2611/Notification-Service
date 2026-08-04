import express from 'express';
import { supabase } from '@notification-gateway/database';
import {
  generateRawApiKey,
  hashApiKey,
  verifyApiKey,
  generateAuthToken,
  createProjectSchema,
  createApiKeySchema
} from '@notification-gateway/shared';

const router = express.Router();

// POST /v1/auth/login - Custom Admin Login (Tanpa Supabase Auth)
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isValidPassword = await verifyApiKey(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Generate Custom JWT Token
    const token = generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Update last_login_at timestamp
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Custom Auth Login Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// GET /v1/admin/projects - List all registered internal projects
router.get('/projects', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: projects });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /v1/admin/projects - Register a new project
router.post('/projects', async (req, res) => {
  const parse = createProjectSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.errors });
  }

  try {
    const { data: newProject, error } = await supabase
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
    return res.status(201).json({ success: true, data: newProject });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /v1/admin/api-keys - Generate a new API Key for a project
router.post('/api-keys', async (req, res) => {
  const parse = createApiKeySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.errors });
  }

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', parse.data.projectId)
      .single();

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const envPrefix = parse.data.environment === 'production' ? 'prod' : 'sand';
    const rawKey = generateRawApiKey(envPrefix, project.slug);
    const keyHash = await hashApiKey(rawKey);
    const prefix = envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_';

    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: parse.data.projectId,
        name: parse.data.name,
        key_prefix: prefix,
        key_hash: keyHash,
        environment: parse.data.environment
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      rawApiKey: rawKey, // Shown ONLY ONCE upon creation
      apiKeyInfo: keyRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
