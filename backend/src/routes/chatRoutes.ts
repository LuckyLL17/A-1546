/**
 * 聊天路由模块
 * 定义聊天相关的API路由
 */

import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有聊天接口都需要登录
router.use(authMiddleware);

/**
 * 获取会话列表
 * GET /api/chat/sessions
 * Query: { page?, page_size? }
 */
router.get('/sessions', chatController.getSessions);

/**
 * 获取会话消息
 * GET /api/chat/sessions/:id/messages
 * Query: { page?, page_size? }
 */
router.get('/sessions/:id/messages', chatController.getMessages);

/**
 * 标记会话已读
 * POST /api/chat/sessions/:id/read
 */
router.post('/sessions/:id/read', chatController.markAsRead);

/**
 * 发送消息
 * POST /api/chat/messages
 * Body: { session_id?, receiver_id?, item_id?, content, message_type? }
 */
router.post('/messages', chatController.sendMessage);

/**
 * 获取未读消息数
 * GET /api/chat/unread-count
 */
router.get('/unread-count', chatController.getUnreadCount);

export default router;
