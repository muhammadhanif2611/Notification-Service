import * as authService from '../services/authService.js';

/**
 * Controller layer untuk handle HTTP requests authentication dan user management.
 */

/**
 * Register user baru.
 * POST /auth/register
 */
export async function register(req, res, next) {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Login user.
 * POST /auth/login
 */
export async function login(req, res, next) {
  try {
    const data = await authService.loginUser(req.body);
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Ambil daftar semua user (admin only).
 * GET /auth/users
 */
export async function listUsers(_req, res, next) {
  try {
    const data = await authService.listUsers();
    return res.json({ 
      success: true, 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Buat akun user/client baru (admin only).
 * POST /auth/users
 */
export async function createUser(req, res, next) {
  try {
    const data = await authService.createUserByAdmin(req.body);
    return res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Update status aktif user (admin only).
 * PUT /auth/users/:id/status
 */
export async function setUserStatus(req, res, next) {
  try {
    const data = await authService.setUserActive(req.params.id, req.body.is_active);
    return res.json({ 
      success: true, 
      message: 'User status updated', 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Hapus user (admin only).
 * DELETE /auth/users/:id
 */
export async function deleteUser(req, res, next) {
  try {
    await authService.deleteUser(req.params.id);
    return res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (err) { 
    next(err); 
  }
}

/**
 * Update user (admin only).
 * PUT /auth/users/:id
 */
export async function updateUser(req, res, next) {
  try {
    const data = await authService.updateUser(req.params.id, req.body);
    return res.json({ 
      success: true, 
      message: 'User updated successfully', 
      data 
    });
  } catch (err) { 
    next(err); 
  }
}
