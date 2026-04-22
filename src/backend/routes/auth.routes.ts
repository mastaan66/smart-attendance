import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Public Routes
router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);

// Protected Routes Example
router.get("/me", verifyToken, (req: any, res: any) => {
  res.status(200).json({ success: true, user: req.user });
});

router.get("/admin-only", verifyToken, authorizeRoles("ADMIN"), (req: any, res: any) => {
  res.status(200).json({ success: true, message: "Welcome Admin" });
});

export default router;
