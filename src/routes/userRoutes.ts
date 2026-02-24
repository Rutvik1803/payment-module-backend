import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get all users (with optional role filter: ?role=student)
router.get('/', asyncHandler(userController.getAllUsers));

// Get user by ID
router.get('/:id', asyncHandler(userController.getUserById));

export default router;
