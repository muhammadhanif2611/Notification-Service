import { writeAuditLog, supabase } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as profileRepository from '../repositories/profileRepository.js';

/**
 * Service layer untuk business logic authentication dan user management.
 */

/**
 * Register user baru.
 * @param {Object} params - { email, password, name, role }
 * @returns {Promise<Object>} Created profile
 */
export async function registerUser({ email, password, name, role = 'user', projectName }) {
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
  const registeredProfile = await profileRepository.insert({
    email: cleanEmail,
    password_hash: passwordHash,
    name,
    role: formattedRole
  });

  // Auto-create default project untuk user baru (client self-service)
  // Project name default: "Project {name}" atau bisa custom dari frontend
  if (formattedRole === 'user') {
    try {
      const defaultProjectName = projectName || `${name}'s Project`;
      const defaultSlug = defaultProjectName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `project-${Date.now()}`;

      await supabase.from('projects').insert({
        owner_id: registeredProfile.id,
        name: defaultProjectName,
        slug: defaultSlug,
        description: 'Default project created on registration',
        rate_limit_per_min: 100,
        daily_quota: 5000,
        is_active: true
      });
    } catch (projError) {
      // Jika gagal buat project, tidak masalah — user bisa buat sendiri nanti
      console.error('Failed to create default project:', projError.message);
    }
  }

  writeAuditLog({ 
    userId: registeredProfile.id, 
    action: 'REGISTER_USER', 
    targetEntity: 'profiles', 
    detail: `Registered ${cleanEmail} as ${formattedRole}` 
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
  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();
  const formattedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';

  const existingProfile = await profileRepository.findByEmail(cleanEmail);
  if (existingProfile) {
    throw new AppError('User dengan email ini sudah terdaftar.', 409, 'USER_EXISTS');
  }

  const passwordHash = await hashApiKey(password);
  const newProfile = await profileRepository.insert({
    email: cleanEmail,
    password_hash: passwordHash,
    name,
    role: formattedRole
  });

  // Buat project untuk client baru (jika role user dan ada project_name)
  // Project di-assign ke owner_id = user client, bukan admin
  if (formattedRole === 'user' && project_name) {
    try {
      const projectSlug = project_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `project-${Date.now()}`;

      await supabase.from('projects').insert({
        owner_id: newProfile.id,
        name: project_name,
        slug: projectSlug,
        description: `Project for ${name}`,
        rate_limit_per_min: rate_limit || 100,
        daily_quota: quota_daily || 5000,
        is_active: true
      });
    } catch (projError) {
      // Jika gagal buat project (mis. slug duplikat), user tetap terbuat
      console.error('Failed to create project for new user:', projError.message);
    }
  }

  writeAuditLog({
    userId: newProfile.id,
    action: 'ADMIN_CREATE_USER',
    targetEntity: 'profiles',
    detail: `Admin created ${formattedRole} account for ${cleanEmail}${project_name ? ` (project: ${project_name})` : ''}`
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
