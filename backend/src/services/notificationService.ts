/**
 * 通知服务模块
 * 处理系统通知相关的业务逻辑
 */

import { query, execute } from '../utils/database';
import { Notification, NotificationType, CreateReportParams, Report } from '../types';
import { RowDataPacket } from 'mysql2';

/**
 * 创建通知
 * 
 * @param userId - 接收用户ID
 * @param title - 通知标题
 * @param content - 通知内容
 * @param type - 通知类型
 * @param relatedId - 关联的业务ID（可选）
 */
export const createNotification = async (
  userId: string,
  title: string,
  content: string,
  type: NotificationType = 'system',
  relatedId?: string
): Promise<number> => {
  const result = await execute(
    `INSERT INTO notifications (user_id, title, content, notification_type, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title, content, type, relatedId || null]
  );
  
  return result.insertId;
};

/**
 * 获取用户的通知列表
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 * @param unreadOnly - 是否只获取未读通知
 */
export const getUserNotifications = async (
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  unreadOnly: boolean = false
): Promise<{ notifications: Notification[]; total: number }> => {
  const conditions: string[] = ['user_id = ?'];
  const values: any[] = [userId];
  
  if (unreadOnly) {
    conditions.push('is_read = 0');
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    values
  );
  const total = countResult[0].total;
  
  // 查询通知列表
  const notifications = await query<Notification>(
    `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  
  return { notifications, total };
};

/**
 * 获取用户未读通知数
 * 
 * @param userId - 用户ID
 * @returns 返回未读通知数
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query<{ count: number } & RowDataPacket>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  
  return result[0].count;
};

/**
 * 标记通知为已读
 * 
 * @param notificationId - 通知ID
 * @param userId - 用户ID（用于权限验证）
 */
export const markAsRead = async (
  notificationId: number,
  userId: string
): Promise<void> => {
  await execute(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
};

/**
 * 标记所有通知为已读
 * 
 * @param userId - 用户ID
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  await execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId]
  );
};

/**
 * 删除通知
 * 
 * @param notificationId - 通知ID
 * @param userId - 用户ID
 */
export const deleteNotification = async (
  notificationId: number,
  userId: string
): Promise<void> => {
  await execute(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
};

/**
 * 创建举报
 * 
 * @param reporterId - 举报者ID
 * @param params - 举报参数
 */
export const createReport = async (
  reporterId: string,
  params: CreateReportParams
): Promise<number> => {
  const { target_type, target_id, reason, description, images } = params;
  
  const imagesJson = images ? JSON.stringify(images) : null;
  
  const result = await execute(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, description, images)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reporterId, target_type, target_id, reason, description || null, imagesJson]
  );
  
  return result.insertId;
};

/**
 * 获取用户的举报列表
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserReports = async (
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ reports: Report[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(*) as total FROM reports WHERE reporter_id = ?',
    [userId]
  );
  const total = countResult[0].total;
  
  // 查询举报列表
  const reports = await query<Report>(
    `SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  
  return { reports, total };
};

// 导出所有服务方法
export default {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createReport,
  getUserReports,
};
