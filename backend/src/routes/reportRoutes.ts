/**
 * 举报路由模块
 * 定义举报相关的API路由
 */

import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有接口都需要登录
router.use(authMiddleware);

/**
 * 创建举报
 * POST /api/reports
 * Body: { target_type, target_id, reason, description?, images? }
 */
router.post('/', notificationController.createReport);

/**
 * 获取我的举报列表
 * GET /api/reports/my
 * Query: { page?, page_size? }
 */
router.get('/my', notificationController.getMyReports);

export default router;
