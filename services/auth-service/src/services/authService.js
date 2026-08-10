import { supabase, writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';

export async function registerUser({ email, password, name, role = 'user' }) {
  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();
  const formattedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();
  if (existing) throw new AppError('User with this email already exists.', 409, 'USER_EXISTS');

  const passwordHash = await hashApiKey(password);

  const { data, error } = await supabase
    .from('profiles')
    .insert({ email: cleanEmail, password_hash: passwordHash, name, role: formattedRole })
    .select('id, email, name, role, created_at')
    .single();
  if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');

  writeAuditLog({ userId: data.id, action: 'REGISTER_USER', targetEntity: 'profiles', detail: `Registered ${cleanEmail} as ${formattedRole}` });
  return data;
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
  }

  const cleanEmail = email.toLowerCase().trim();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', cleanEmail)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !user) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const isValid = await verifyApiKey(password, user.password_hash);
  if (!isValid) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const token = generateAuthToken({ userId: user.id, email: user.email, name: user.name, role: user.role });

  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
  writeAuditLog({ userId: user.id, action: 'LOGIN', targetEntity: 'profiles', detail: `${cleanEmail} logged in` });

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
