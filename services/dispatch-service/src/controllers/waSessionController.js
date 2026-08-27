import { z } from 'zod';
import { createLogger } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as sessionManager from '../whatsapp/session-manager.js';
import * as waSessionRepository from '../repositories/waSessionRepository.js';

const logger = createLogger('dispatch-service');

// Skema validasi query projectId untuk endpoint client
const projectQuerySchema = z.object({
  projectId: z.string().uuid('projectId harus berupa UUID valid')
});

// Skema validasi body kosong/opsional projectId untuk endpoint connect & reset
const projectBodySchema = z.object({
  projectId: z.string().uuid('projectId harus berupa UUID valid').optional()
});

/**
 * Memvalidasi kepemilikan project oleh user (admin bebas akses semua project).
 * @param {string} projectId
 * @param {{ userId: string, role: string }} user
 * @returns {Promise<void>}
 * @throws {AppError} 403 jika user bukan pemilik project
 */
async function assertProjectOwnership(projectId, user) {
  if (user?.role === 'admin') return;
  const owned = await waSessionRepository.findOwnedProject(projectId, user?.userId);
  if (!owned) {
    throw new AppError('Project not found or access forbidden', 403, 'FORBIDDEN');
  }
}

/**
 * Menggabungkan status sesi dari session-manager dengan info project dari database.
 * @param {Array<object>} projects — Daftar project dari DB
 * @returns {Array<object>} Daftar sesi dengan nama project
 */
function mergeSessionStatuses(projects) {
  const statusMap = new Map(
    sessionManager.getAllSessionStatuses().map((s) => [s.projectId, s])
  );
  return projects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    status: statusMap.get(project.id)?.status || 'DISCONNECTED',
    connectedAt: statusMap.get(project.id)?.connectedAt || null
  }));
}

// Controller: status sesi WA untuk satu project milik client (query: projectId)
export async function getSession(req, res, next) {
  try {
    const validation = projectQuerySchema.safeParse(req.query);
    if (!validation.success) {
      throw new AppError('projectId query is required', 400, 'VALIDATION_ERROR', validation.error.errors);
    }

    const { projectId } = validation.data;
    await assertProjectOwnership(projectId, req.user);

    const data = sessionManager.getProjectSessionStatus(projectId);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: inisiasi koneksi sesi WA satu project (generate QR)
export async function connectSession(req, res, next) {
  try {
    const validation = projectBodySchema.safeParse(req.body || {});
    if (!validation.success) {
      throw new AppError('Invalid payload', 400, 'VALIDATION_ERROR', validation.error.errors);
    }

    const { projectId } = validation.data;
    if (!projectId) {
      throw new AppError('projectId is required', 400, 'VALIDATION_ERROR');
    }

    await assertProjectOwnership(projectId, req.user);
    await sessionManager.connectProject(projectId);

    logger.info({ projectId, userId: req.user?.userId }, 'WhatsApp session connect requested');
    const data = sessionManager.getProjectSessionStatus(projectId);
    return res.json({ success: true, message: 'Connection initiated. Scan the QR code when available.', data });
  } catch (err) { next(err); }
}

// Controller: reset sesi WA satu project (logout + hapus auth state + QR baru)
export async function resetSession(req, res, next) {
  try {
    const validation = projectBodySchema.safeParse(req.body || {});
    if (!validation.success) {
      throw new AppError('Invalid payload', 400, 'VALIDATION_ERROR', validation.error.errors);
    }

    const { projectId } = validation.data;
    if (!projectId) {
      throw new AppError('projectId is required', 400, 'VALIDATION_ERROR');
    }

    await assertProjectOwnership(projectId, req.user);
    await sessionManager.resetProjectSession(projectId);

    logger.info({ projectId, userId: req.user?.userId }, 'WhatsApp session reset');
    const data = sessionManager.getProjectSessionStatus(projectId);
    return res.json({ success: true, message: 'WhatsApp session reset. Scan the new QR code.', data });
  } catch (err) { next(err); }
}


// Controller: daftar seluruh sesi WA dengan nama project (client: miliknya, admin: semua)
export async function listAllSessions(req, res, next) {
  try {
    const projects = req.user?.role === 'admin'
      ? await waSessionRepository.findAllProjects()
      : await waSessionRepository.findProjectsByOwnerId(req.user?.userId);

    const data = mergeSessionStatuses(projects);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: force-disconnect sesi WA satu project (admin only)
export async function disconnectSessionByProject(req, res, next) {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      throw new AppError('projectId param is required', 400, 'VALIDATION_ERROR');
    }

    await sessionManager.disconnectProject(projectId);
    logger.info({ projectId, adminId: req.user?.userId }, 'WhatsApp session force-disconnected by admin');
    return res.json({ success: true, message: `Session for project ${projectId} disconnected.` });
  } catch (err) { next(err); }
}
