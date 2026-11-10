import { Router } from 'express'
import { getCurrentUser, updateProfile } from '../controller/auth.controller.js';
import { enabledSocialProviders } from '../lib/auth.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router()

router.get("/providers", (_req, res) => res.json({ providers: enabledSocialProviders }));
router.get("/me", protectRoute, getCurrentUser)
router.patch("/profile", protectRoute, updateProfile)

export default router
