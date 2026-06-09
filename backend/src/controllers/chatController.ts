/**
 * 聊天控制器模块
 * 处理聊天相关的HTTP请求
 */

import { Request, Response } from 'express';
import * as chatService from '../services/chatService';
import { success, error, paginated } from '../utils/response';
import { isEmpty, isValidUUID } from '../utils/validator';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * 发送消息
 * POST /api/chat/messages
 * 需要登录
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const senderId = req.user!.userId;
  const { session_id, receiver_id, item_id, content, message_type } = req.body;

  if (isEmpty(content)) {
    error(res, '消息内容不能为空');
    return;
  }

  if (content.length > 1000) {
    error(res, '消息内容不能超过1000个字符');
    return;
  }

  if (!session_id && !receiver_id) {
    error(res, '必须提供会话ID或接收者ID');
    return;
  }

  if (session_id && !isValidUUID(session_id)) {
    error(res, '无效的会话ID');
    return;
  }

  if (receiver_id && !isValidUUID(receiver_id)) {
    error(res, '无效的接收者ID');
    return;
  }

  if (receiver_id && receiver_id === senderId) {
    error(res, '不能给自己发消息');
    return;
  }

  const validTypes = ['text', 'image', 'item'];
  if (message_type && !validTypes.includes(message_type)) {
    error(res, '无效的消息类型');
    return;
  }

  const messageId = await chatService.sendMessage(senderId, {
    session_id, receiver_id, item_id, content, message_type,
  });

  success(res, { id: messageId }, '发送成功');
});

/**
 * 获取会话列表
 * GET /api/chat/sessions
 * 需要登录
 */
export const getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 20 } = req.query;

  const { sessions, total } = await chatService.getUserSessions(
    userId, Number(page), Number(page_size)
  );

  paginated(res, sessions, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 获取会话消息
 * GET /api/chat/sessions/:id/messages
 * 需要登录
 */
export const getMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { page = 1, page_size = 50 } = req.query;

  if (!isValidUUID(id)) {
    error(res, '无效的会话ID');
    return;
  }

  const { messages, total } = await chatService.getSessionMessages(
    id, userId, Number(page), Number(page_size)
  );

  paginated(res, messages, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 获取未读消息数
 * GET /api/chat/unread-count
 * 需要登录
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const count = await chatService.getUnreadCount(userId);
  success(res, { count }, '获取成功');
});

/**
 * 标记会话已读
 * POST /api/chat/sessions/:id/read
 * 需要登录
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的会话ID');
    return;
  }

  await chatService.markAsRead(id, userId);
  success(res, null, '标记成功');
});

// 导出所有控制器方法
export default {
  sendMessage, getSessions, getMessages, getUnreadCount, markAsRead,
};
