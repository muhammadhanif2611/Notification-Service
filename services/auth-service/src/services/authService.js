import { writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken, generateSlug, createLogger } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as profileRepository from '../repositories/profileRepository.js';

const logger = createLogger('auth-service');

// URL internal client-service untuk pembuatan project (bounded context)
const CLIENT_SERVICE_URL = process.env.CLIENT_SERVICE_URL || 'http://localhost:3003';

/**
 * Service layer untuk business logic authentication dan user management.
 */

/**
 * Membuat profile user baru (dipakai registerUser & createUserByAdmin).
 * @param {{ email: string, password: string, name: string, role: string }} params
 * @returns {Promise<Object>} Created profile
 * @throws {AppError} 400 jika input tidak lengkap, 409 jika email sudah terdaftar
 */
async function createProfile({ email, password, name, role = 'user' }) {
  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();
  const formattedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';

  const existingProfile = await profileRepository.findByEmail(cleanEmail);
  if (existingProfile) {
    throw new AppError('User with this email already exists.', 409, 'USER_EXISTS');
  }

  const passwordHash = await hashApiKey(password);
  return profileRepository.insert({
    email: cleanEmail,
    password_hash: passwordHash,
    name,
    role: formattedRole
  });
}

/**
 * Membuat project default untuk user baru via HTTP internal ke client-service.
 * Tabel projects adalah domain milik client-service — auth-service tidak menulis langsung ke DB.
 * @param {{ ownerId: string, projectName: string, description: string, rateLimit?: number, dailyQuota?: number }} params
 * @returns {Promise<void>}
 */
async function createDefaultProject({ ownerId, projectName, description, rateLimit = 100, dailyQuota = 5000 }) {
  try {
    const response = await fetch(`${CLIENT_SERVICE_URL}/clients/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ownerId,
        'x-user-role': 'user'
      },
      body: JSON.stringify({
        name: projectName,
        slug: generateSlug(projectName),
        description,
        rateLimitPerMin: rateLimit,
        dailyQuota
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      logger.warn({ ownerId, status: response.status, err: body?.error?.message }, 'Failed to create default project via client-service');
    }
  } catch (err) {
    // Kegagalan pembuatan project tidak boleh menggagalkan registrasi user
    logger.error({ ownerId, err: err.message }, 'Client-service unreachable when creating default project');
  }
}

/**
 * Register user baru.
 * @param {Object} params - { email, password, name, role, projectName }
 * @returns {Promise<Object>} Created profile
 */
export async function registerUser({ email, password, name, role = 'user', projectName }) {
  const registeredProfile = await createProfile({ email, password, name, role });

  // Auto-create default project untuk user baru (client self-service)
  if (registeredProfile.role === 'user') {
    await createDefaultProject({
      ownerId: registeredProfile.id,
      projectName: projectName || `${name}'s Project`,
      description: 'Default project created on registration'
    });
  }

  writeAuditLog({
    userId: registeredProfile.id,
    action: 'REGISTER_USER',
    targetEntity: 'profiles',
    detail: `Registered ${registeredProfile.email} as ${registeredProfile.role}`
  });

  return registeredProfile;
}

/**
 * Login user.
 * @param {Object} params - { email, password }
 * @returns {Promise<Object>} { token, user }
 */
export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();
  const userProfile = await profileRepository.findActiveByEmail(cleanEmail);
  
  if (!userProfile) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await verifyApiKey(password, userProfile.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateAuthToken({
    userId: userProfile.id,
    email: userProfile.email,
    name: userProfile.name,
    role: userProfile.role
  });

  profileRepository.updateLastLogin(userProfile.id);
  writeAuditLog({ 
    userId: userProfile.id, 
    action: 'LOGIN', 
    targetEntity: 'profiles', 
    detail: `${cleanEmail} logged in` 
  });

  return {
    token,
    user: { 
      id: userProfile.id, 
      email: userProfile.email, 
      name: userProfile.name, 
      role: userProfile.role 
    }
  };
}

/**
 * Ambil daftar semua user (untuk admin).
 * @returns {Promise<Array>} Array of users
 */
export async function listUsers() {
  return profileRepository.findAll();
}

/**
 * Buat akun user/client baru (oleh admin).
 * @param {Object} params - { email, password, name, role, project_name, quota_daily, rate_limit }
 * @returns {Promise<Object>} Created profile dengan metadata
 */
export async function createUserByAdmin({ email, password, name, role = 'user', project_name, quota_daily, rate_limit }) {
  const newProfile = await createProfile({ email, password, name, role });

  // Buat project untuk client baru (jika role user dan ada project_name)
  // Project di-assign ke owner_id = user client, bukan admin
  if (newProfile.role === 'user' && project_name) {
    await createDefaultProject({
      ownerId: newProfile.id,
      projectName: project_name,
      description: `Project for ${name}`,
      rateLimit: rate_limit,
      dailyQuota: quota_daily
    });
  }

  writeAuditLog({
    userId: newProfile.id,
    action: 'ADMIN_CREATE_USER',
    targetEntity: 'profiles',
    detail: `Admin created ${newProfile.role} account for ${newProfile.email}${project_name ? ` (project: ${project_name})` : ''}`
  });

  return { ...newProfile, project_name, quota_daily, rate_limit };
}

/**
 * Update status aktif user (suspend/activate).
 * @param {string} id - User ID
 * @param {boolean} isActive - Status aktif
 * @returns {Promise<Object>} Updated profile
 */
export async function setUserActive(id, isActive) {
  const updated = await profileRepository.setActive(id, isActive);
  
  writeAuditLog({
    userId: id,
    action: isActive ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_SUSPEND_USER',
    targetEntity: 'profiles',
    detail: `User ${updated.email} ${isActive ? 'activated' : 'suspended'}`
  });
  
  return updated;
}

/**
 * Hapus user.
 * @param {string} id - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteUser(id) {
  await profileRepository.remove(id);
  
  writeAuditLog({ 
    userId: id, 
    action: 'ADMIN_DELETE_USER', 
    targetEntity: 'profiles', 
    detail: `User ${id} deleted` 
  });
  
  return true;
}

/**
 * Update user (untuk admin edit).
 * @param {string} id - User ID
 * @param {Object} params - { name, email, role, project_name, quota_daily, rate_limit }
 * @returns {Promise<Object>} Updated profile dengan metadata
 */
export async function updateUser(id, { name, email, role, project_name, quota_daily, rate_limit }) {
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role.toLowerCase() === 'admin' ? 'admin' : 'user';
  
  const updated = await profileRepository.update(id, updateData);
  
  writeAuditLog({
    userId: id,
    action: 'ADMIN_UPDATE_USER',
    targetEntity: 'profiles',
    detail: `User ${updated.email} updated${project_name ? ` (project: ${project_name})` : ''}`
  });
  
  return { ...updated, project_name, quota_daily, rate_limit };
}
