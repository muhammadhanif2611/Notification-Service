import { AppError } from '../middlewares/errorHandler.js';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

const VALID_CHANNELS = ['WHATSAPP', 'EMAIL'];
const VALID_REASONS = ['HARD_BOUNCE', 'SPAM_COMPLAINT', 'UNSUBSCRIBE', 'MANUAL'];

// Controller: Suppression List — daftar kontak terblokir per channel (admin only via gateway)

export async function listSuppressions(req, res, next) {
  try {
    const channel = req.query.channel || null;
    const data = await callbackLogRepository.findSuppressions(channel);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createSuppression(req, res, next) {
  try {
    const { contact, channel, reason = 'MANUAL', notes = null, sourceLogId = null } = req.body || {};
    if (!contact || !channel) throw new AppError('contact and channel are required', 400, 'VALIDATION_ERROR');
    if (!VALID_CHANNELS.includes(channel)) throw new AppError('Invalid channel', 400, 'VALIDATION_ERROR');
    if (!VALID_REASONS.includes(reason)) throw new AppError('Invalid reason', 400, 'VALIDATION_ERROR');

    const data = await callbackLogRepository.insertSuppression({ contact, channel, reason, notes, sourceLogId });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteSuppression(req, res, next) {
  try {
    const existing = await callbackLogRepository.findSuppressionById(req.params.id);
    if (!existing) throw new AppError('Suppression entry not found', 404, 'NOT_FOUND');

    await callbackLogRepository.deleteSuppression(req.params.id);
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
}
