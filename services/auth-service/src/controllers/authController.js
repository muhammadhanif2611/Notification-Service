import * as authService from '../services/authService.js';

// Controller: registrasi user baru
export async function register(req, res, next) {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(201).json({ success: true, message: 'User registered successfully', data });
  } catch (err) { next(err); }
}

// Controller: login user
export async function login(req, res, next) {
  try {
    const data = await authService.loginUser(req.body);
    return res.json({ success: true, message: 'Login successful', data });
  } catch (err) { next(err); }
}

// Controller: daftar semua user (admin)
export async function listUsers(_req, res, next) {
  try {
    const data = await authService.listUsers();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: admin membuat akun user/client baru
export async function createUser(req, res, next) {
  try {
    const data = await authService.createUserByAdmin(req.body);
    return res.status(201).json({ success: true, message: 'User created successfully', data });
  } catch (err) { next(err); }
}

// Controller: admin mengubah status aktif user
export async function setUserStatus(req, res, next) {
  try {
    const data = await authService.setUserActive(req.params.id, req.body.is_active);
    return res.json({ success: true, message: 'User status updated', data });
  } catch (err) { next(err); }
}

// Controller: admin menghapus user
export async function deleteUser(req, res, next) {
  try {
    await authService.deleteUser(req.params.id);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) { next(err); }
}
