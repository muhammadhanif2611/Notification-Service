import * as adminService from '../services/adminService.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('gateway-service');

// Controller: login admin
export async function login(req, res) {
  try {
    const data = await adminService.loginAdmin(req.body);
    return res.json({ success: true, ...data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    logger.error({ err: err.message }, 'Admin login failed');
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

// Controller: mengambil daftar project
export async function getProjects(_req, res) {
  try {
    const data = await adminService.listProjects();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Controller: membuat project baru
export async function createProject(req, res) {
  try {
    const data = await adminService.createProject(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.details });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Controller: membuat API Key baru
export async function generateApiKey(req, res) {
  try {
    const data = await adminService.generateApiKey(req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message || err.details });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}
