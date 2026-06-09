/**
 * 用户路由模块
 * 定义用户相关的API路由
 */

import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as orderController from '../controllers/orderController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// =====================================================
// 公开接口（无需登录）
// =====================================================

/**
 * 用户注册
 * POST /api/users/register
 * Body: { username, password, email, phone? }
 */
router.post('/register', userController.register);

/**
 * 用户登录
 * POST /api/users/login
 * Body: { username, password }
 */
router.post('/login', userController.login);

// =====================================================
// 需要登录的接口（放在 /:id 之前，避免被拦截）
// =====================================================

/**
 * 获取当前登录用户信息
 * GET /api/users/profile
 */
router.get('/profile', authMiddleware, userController.getProfile);

/**
 * 更新用户信息
 * PUT /api/users/profile
 * Body: { real_name?, phone?, avatar?, school?, campus?, dormitory?, student_id? }
 */
router.put('/profile', authMiddleware, userController.updateProfile);

/**
 * 修改密码
 * PUT /api/users/password
 * Body: { old_password, new_password }
 */
router.put('/password', authMiddleware, userController.changePassword);

// =====================================================
// 带参数的公开接口（放在最后）
// =====================================================

/**
 * 获取用户公开信息
 * GET /api/users/:id
 */
router.get('/:id', userController.getUserPublicInfo);

/**
 * 获取用户收到的评价
 * GET /api/users/:id/reviews
 */
router.get('/:id/reviews', orderController.getUserReviews);

export default router;
