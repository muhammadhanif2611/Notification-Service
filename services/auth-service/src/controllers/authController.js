import { AuthService } from '../services/authService.js';

/**
 * Controller for Auth Routes
 */
export class AuthController {
  static async register(req, res, next) {
    try {
      const user = await AuthService.registerUser(req.body);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.loginUser(req.body);
      return res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}
