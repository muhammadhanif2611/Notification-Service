import { supabase, writeAuditLog } from '@notification-gateway/database';
import { hashApiKey, verifyApiKey, generateAuthToken } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Business Logic Service for Authentication & User Profiles
 */
export class AuthService {
  /**
   * Register a new user profile
   */
  static async registerUser({ email, password, name, role = 'user' }) {
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required fields.', 400, 'VALIDATION_ERROR');
    }

    const cleanEmail = email.toLowerCase().trim();
    const formattedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';

    // Check existing user
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      throw new AppError('User with this email already exists.', 409, 'USER_EXISTS');
    }

    const passwordHash = await hashApiKey(password);

    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert({
        email: cleanEmail,
        password_hash: passwordHash,
        name,
        role: formattedRole
      })
      .select('id, email, name, role, created_at')
      .single();

    if (error) {
      throw new AppError(`Database Error: ${error.message}`, 500, 'DATABASE_ERROR');
    }

    // Write audit log asynchronously
    writeAuditLog({
      userId: newUser.id,
      action: 'REGISTER_USER',
      targetEntity: 'profiles',
      detail: `Registered new user ${cleanEmail} with role ${formattedRole}`
    });

    return newUser;
  }

  /**
   * Authenticate user credentials and return JWT Token
   */
  static async loginUser({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required fields.', 400, 'VALIDATION_ERROR');
    }

    const cleanEmail = email.toLowerCase().trim();

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyApiKey(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Update last login timestamp
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Audit log
    writeAuditLog({
      userId: user.id,
      action: 'LOGIN',
      targetEntity: 'profiles',
      detail: `User ${cleanEmail} logged in successfully`
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }
}
