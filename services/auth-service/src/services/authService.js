import { writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as profileRepository from '../repositories/profileRepository.js';

// Layanan pendaftaran pengguna baru
export async function registerUser({ email, password, name, role = 'user' }) {
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

  writeAuditLog({ userId: registeredProfile.id, action: 'REGISTER_USER', targetEntity: 'profiles', detail: `Registered ${cleanEmail} as ${formattedRole}` });
  return registeredProfile;
}

// Layanan autentikasi login pengguna
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
  writeAuditLog({ userId: userProfile.id, action: 'LOGIN', targetEntity: 'profiles', detail: `${cleanEmail} logged in` });

  return {
    token,
    user: { id: userProfile.id, email: userProfile.email, name: userProfile.name, role: userProfile.role }
  };
}

// Layanan: mengambil daftar semua user (untuk admin)
export async function listUsers() {
  return profileRepository.findAll();
}

// Layanan: membuat akun user/client baru (dibuat oleh admin)
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

  writeAuditLog({
    userId: newProfile.id,
    action: 'ADMIN_CREATE_USER',
    targetEntity: 'profiles',
    detail: `Admin created ${formattedRole} account for ${cleanEmail}${project_name ? ` (project: ${project_name})` : ''}`
  });

  return { ...newProfile, project_name, quota_daily, rate_limit };
}

// Layanan: mengubah status aktif user (suspend/activate)
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

// Layanan: menghapus user
export async function deleteUser(id) {
  await profileRepository.remove(id);
  writeAuditLog({ userId: id, action: 'ADMIN_DELETE_USER', targetEntity: 'profiles', detail: `User ${id} deleted` });
  return true;
}
