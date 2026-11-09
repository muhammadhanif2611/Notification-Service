import { writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken, createLogger } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as profileRepository from '../repositories/profileRepository.js';

const logger = createLogger('auth-service');

// Service layer untuk autentikasi JWT dan manajemen akun pengguna (Admin & Client).
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

export async function registerUser({ email, password, name, role = 'user' }) {
  const registeredProfile = await createProfile({ email, password, name, role });

  writeAuditLog({
    userId: registeredProfile.id,
    action: 'REGISTER_USER',
    targetEntity: 'profiles',
    detail: `Registered ${registeredProfile.email} as ${registeredProfile.role}`
  });

  return registeredProfile;
}

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

export async function listUsers() {
  return profileRepository.findAll();
}

export async function createUserByAdmin({ email, password, name, role = 'user' }) {
  const newProfile = await createProfile({ email, password, name, role });

  writeAuditLog({
    userId: newProfile.id,
    action: 'ADMIN_CREATE_USER',
    targetEntity: 'profiles',
    detail: `Admin created ${newProfile.role} account for ${newProfile.email}`
  });

  return newProfile;
}

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

export async function updateUser(id, { name, email, role, password }) {
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role.toLowerCase() === 'admin' ? 'admin' : 'user';
  if (password) updateData.password_hash = await hashApiKey(password);

  const updated = await profileRepository.update(id, updateData);

  writeAuditLog({
    userId: id,
    action: 'ADMIN_UPDATE_USER',
    targetEntity: 'profiles',
    detail: `User ${updated.email} updated`
  });

  logger.info({ userId: id }, 'User profile updated by admin');
  return updated;
}
