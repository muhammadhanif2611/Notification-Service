import { writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as profileRepository from '../repositories/profileRepository.js';

// Service: logika bisnis autentikasi user

export async function registerUser({ email, password, name, role = 'user' }) {
  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();
  const formattedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';

  const existing = await profileRepository.findByEmail(cleanEmail);
  if (existing) throw new AppError('User with this email already exists.', 409, 'USER_EXISTS');

  const passwordHash = await hashApiKey(password);

  try {
    const data = await profileRepository.insert({
      email: cleanEmail, password_hash: passwordHash, name, role: formattedRole
    });

    writeAuditLog({ userId: data.id, action: 'REGISTER_USER', targetEntity: 'profiles', detail: `Registered ${cleanEmail} as ${formattedRole}` });
    return data;
  } catch (error) {
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();

  const user = await profileRepository.findActiveByEmail(cleanEmail);
  if (!user) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const isValid = await verifyApiKey(password, user.password_hash);
  if (!isValid) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const token = generateAuthToken({ userId: user.id, email: user.email, name: user.name, role: user.role });

  profileRepository.updateLastLogin(user.id);
  writeAuditLog({ userId: user.id, action: 'LOGIN', targetEntity: 'profiles', detail: `${cleanEmail} logged in` });

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
