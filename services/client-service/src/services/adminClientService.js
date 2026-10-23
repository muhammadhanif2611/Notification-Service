import { adminClientFiltersSchema, adminClientIdSchema } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as repository from '../repositories/adminClientRepository.js';

function assertAdmin(user) {
  if (!user?.userId || user.role !== 'admin') throw new AppError('Admin access required', 403, 'FORBIDDEN');
}

export async function listClients(filters, user) {
  assertAdmin(user);
  const parsed = adminClientFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new AppError('Invalid client filters', 400, 'VALIDATION_ERROR');
  // Remove PostgREST filter syntax and SQL wildcard characters from literal searches.
  const search = parsed.data.search.replace(/[(),.%_*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
  return repository.findClients({ ...parsed.data, search });
}

export async function getClientDetails(id, user) {
  assertAdmin(user);
  if (!adminClientIdSchema.safeParse(id).success) throw new AppError('Invalid client ID', 400, 'VALIDATION_ERROR');
  const client = await repository.findClient(id);
  if (!client) throw new AppError('Client not found', 404, 'NOT_FOUND');
  const projects = await repository.findClientProjects(id);
  return { ...client, projects };
}
