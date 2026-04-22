import { AuthService } from "../services/auth.service";

export class AuthController {
  static async signup(req: any, res: any) {
    try {
      const result = await AuthService.signup(req.body);
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        ...result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Signup failed"
      });
    }
  }

  static async login(req: any, res: any) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json({
        success: true,
        message: "Login successful",
        ...result
      });
    } catch (error: any) {
      // Specific error handling for face/device mismatches
      const status = error.message.includes("Face") || error.message.includes("Device") ? 403 : 401;
      return res.status(status).json({
        success: false,
        message: error.message || "Login failed"
      });
    }
  }
}
