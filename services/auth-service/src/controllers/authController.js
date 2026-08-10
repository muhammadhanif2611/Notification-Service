import * as authService from '../services/authService.js';

export async function register(req, res, next) {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(201).json({ success: true, message: 'User registered successfully', data });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const data = await authService.loginUser(req.body);
    return res.json({ success: true, message: 'Login successful', data });
  } catch (err) { next(err); }
}
