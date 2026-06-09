/**
 * 聊天服务模块
 * 处理用户之间的聊天功能，包括会话管理、消息发送与接收
 */

import { v4 as uuidv4 } from 'uuid';
import { query, execute, getConnection } from '../utils/database';
import { ChatSession, ChatMessage, SendMessageParams } from '../types';
import { RowDataPacket } from 'mysql2';
import { AppError, ErrorCode, assertRequiredId } from '../utils/errors';
import logger from '../utils/logger';

/**
 * 获取或创建聊天会话
 * 如果两个用户之间已存在关于某物品的会话，则返回该会话
 * 否则创建新的会话
 * 
 * @param user1Id - 用户1 ID
 * @param user2Id - 用户2 ID
 * @param itemId - 关联的物品ID（可选）
 * @returns 返回会话ID
 */
export const getOrCreateSession = async (
  user1Id: string,
  user2Id: string,
  itemId?: string
): Promise<string> => {
  // 查找已存在的会话
  // 注意：会话中user1和user2可能是任意顺序
  const existingSessions = await query<ChatSession>(
    `SELECT * FROM chat_sessions 
     WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
     AND (item_id = ? OR (item_id IS NULL AND ? IS NULL))`,
    [user1Id, user2Id, user2Id, user1Id, itemId || null, itemId || null]
  );
  
  if (existingSessions.length > 0) {
    return existingSessions[0].id;
  }
  
  // 创建新会话
  const sessionId = uuidv4();
  
  await execute(
    'INSERT INTO chat_sessions (id, item_id, user1_id, user2_id) VALUES (?, ?, ?, ?)',
    [sessionId, itemId || null, user1Id, user2Id]
  );
  
  return sessionId;
};

/**
 * 发送消息
 * 
 * @param senderId - 发送者ID
 * @param params - 消息参数
 * @returns 返回消息ID
 */
export const sendMessage = async (
  senderId: string,
  params: SendMessageParams
): Promise<number> => {
  assertRequiredId(senderId, '发送者ID');
  const { session_id, receiver_id, item_id, content, message_type = 'text' } = params;
  
  let sessionId = session_id;
  
  // 如果没有提供会话ID，则创建新会话
  if (!sessionId) {
    if (!receiver_id) {
      throw AppError.badRequest('必须提供会话ID或接收者ID', ErrorCode.CHAT_PARAM_MISSING);
    }
    sessionId = await getOrCreateSession(senderId, receiver_id, item_id);
  }
  
  // 验证发送者是否属于该会话
  const session = await getSessionById(sessionId);
  if (session.user1_id !== senderId && session.user2_id !== senderId) {
    throw AppError.forbidden('无权在此会话中发送消息', ErrorCode.FORBIDDEN);
  }
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 插入消息
    const [result] = await connection.execute(
      'INSERT INTO chat_messages (session_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
      [sessionId, senderId, content, message_type]
    );
    
    const messageId = (result as any).insertId;
    
    // 更新会话的最后消息
    await connection.execute(
      'UPDATE chat_sessions SET last_message = ?, last_message_time = NOW() WHERE id = ?',
      [content.substring(0, 100), sessionId]
    );
    
    await connection.commit();
    
    logger.info('消息发送成功', { messageId, sessionId, senderId, messageType: message_type });

    return messageId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 根据ID获取会话
 * 
 * @param sessionId - 会话ID
 * @returns 返回会话详情
 */
export const getSessionById = async (sessionId: string): Promise<ChatSession> => {
  assertRequiredId(sessionId, '会话ID');
  const sessions = await query<ChatSession>(
    'SELECT * FROM chat_sessions WHERE id = ?',
    [sessionId]
  );
  
  if (sessions.length === 0) {
    throw AppError.notFound('会话不存在', ErrorCode.CHAT_SESSION_NOT_FOUND);
  }
  
  return sessions[0];
};

/**
 * 获取用户的会话列表
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 * @returns 返回会话列表
 */
export const getUserSessions = async (
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ sessions: any[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total FROM chat_sessions 
     WHERE user1_id = ? OR user2_id = ?`,
    [userId, userId]
  );
  const total = countResult[0].total;
  
  // 查询会话列表，包含对方用户信息和物品信息
  const sessions = await query<ChatSession & RowDataPacket>(
    `SELECT 
       cs.*,
       CASE WHEN cs.user1_id = ? THEN u2.id ELSE u1.id END as other_user_id,
       CASE WHEN cs.user1_id = ? THEN u2.username ELSE u1.username END as other_username,
       CASE WHEN cs.user1_id = ? THEN u2.avatar ELSE u1.avatar END as other_avatar,
       i.title as item_title,
       i.images as item_images,
       (SELECT COUNT(*) FROM chat_messages cm 
        WHERE cm.session_id = cs.id AND cm.sender_id != ? AND cm.is_read = 0) as unread_count
     FROM chat_sessions cs
     LEFT JOIN users u1 ON cs.user1_id = u1.id
     LEFT JOIN users u2 ON cs.user2_id = u2.id
     LEFT JOIN items i ON cs.item_id = i.id
     WHERE cs.user1_id = ? OR cs.user2_id = ?
     ORDER BY COALESCE(cs.last_message_time, cs.created_at) DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, userId, userId, userId, userId, pageSize, offset]
  );
  
  return { sessions, total };
};

/**
 * 获取会话的消息列表
 * 
 * @param sessionId - 会话ID
 * @param userId - 当前用户ID（用于权限检查）
 * @param page - 页码
 * @param pageSize - 每页数量
 * @returns 返回消息列表
 */
export const getSessionMessages = async (
  sessionId: string,
  userId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ messages: ChatMessage[]; total: number }> => {
  // 检查权限
  const session = await getSessionById(sessionId);
  if (session.user1_id !== userId && session.user2_id !== userId) {
    throw AppError.forbidden('无权查看此会话', ErrorCode.FORBIDDEN);
  }
  
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(*) as total FROM chat_messages WHERE session_id = ?',
    [sessionId]
  );
  const total = countResult[0].total;
  
  // 查询消息列表
  const messages = await query<ChatMessage>(
    `SELECT cm.*, u.username as sender_username, u.avatar as sender_avatar
     FROM chat_messages cm
     LEFT JOIN users u ON cm.sender_id = u.id
     WHERE cm.session_id = ?
     ORDER BY cm.created_at DESC
     LIMIT ? OFFSET ?`,
    [sessionId, pageSize, offset]
  );
  
  // 标记消息为已读
  await execute(
    'UPDATE chat_messages SET is_read = 1 WHERE session_id = ? AND sender_id != ?',
    [sessionId, userId]
  );
  
  return { messages: messages.reverse(), total };
};

/**
 * 获取用户的未读消息数
 * 
 * @param userId - 用户ID
 * @returns 返回未读消息总数
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query<{ count: number } & RowDataPacket>(
    `SELECT COUNT(*) as count
     FROM chat_messages cm
     JOIN chat_sessions cs ON cm.session_id = cs.id
     WHERE (cs.user1_id = ? OR cs.user2_id = ?)
     AND cm.sender_id != ?
     AND cm.is_read = 0`,
    [userId, userId, userId]
  );
  
  return result[0].count;
};

/**
 * 标记会话所有消息为已读
 * 
 * @param sessionId - 会话ID
 * @param userId - 用户ID
 */
export const markAsRead = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  assertRequiredId(sessionId, '会话ID');
  assertRequiredId(userId, '用户ID');
  // 检查权限
  const session = await getSessionById(sessionId);
  if (session.user1_id !== userId && session.user2_id !== userId) {
    throw AppError.forbidden('无权操作此会话', ErrorCode.FORBIDDEN);
  }
  
  await execute(
    'UPDATE chat_messages SET is_read = 1 WHERE session_id = ? AND sender_id != ?',
    [sessionId, userId]
  );
};

// 导出所有服务方法
export default {
  getOrCreateSession,
  sendMessage,
  getSessionById,
  getUserSessions,
  getSessionMessages,
  getUnreadCount,
  markAsRead,
};
