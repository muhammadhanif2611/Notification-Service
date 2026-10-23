import * as service from '../services/adminClientService.js';

const userOf = (req) => req.user || { userId: req.headers['x-user-id'], role: req.headers['x-user-role'] };

export async function listClients(req, res, next) {
  try { return res.json({ success: true, data: await service.listClients(req.query, userOf(req)) }); }
  catch (error) { next(error); }
}

export async function getClientDetails(req, res, next) {
  try { return res.json({ success: true, data: await service.getClientDetails(req.params.id, userOf(req)) }); }
  catch (error) { next(error); }
}
