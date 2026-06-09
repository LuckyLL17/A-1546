/**
 * 通知和举报路由模块
 * 定义通知和举报相关的API路由
 */

import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有接口都需要登录
router.use(authMiddleware);

// =====================================================
// 通知接口
// =====================================================

/**
 * 获取通知列表
 * GET /api/notifications
 * Query: { page?, page_size?, unread_only? }
 */
router.get('/', notificationController.getNotifications);

/**
 * 获取未读通知数
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * 标记所有通知为已读
 * POST /api/notifications/read-all
 */
router.post('/read-all', notificationController.markAllAsRead);

/**
 * 标记单个通知为已读
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', notificationController.markAsRead);

/**
 * 删除通知
 * DELETE /api/notifications/:id
 */
router.delete('/:id', notificationController.deleteNotification);

export default router;
