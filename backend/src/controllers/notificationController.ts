/**
 * 通知控制器模块
 * 处理通知和举报相关的HTTP请求
 */

import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';
import { success, error, paginated } from '../utils/response';
import { isEmpty } from '../utils/validator';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * 获取通知列表
 * GET /api/notifications
 * 需要登录
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 20, unread_only = 'false' } = req.query;

  const { notifications, total } = await notificationService.getUserNotifications(
    userId, Number(page), Number(page_size), unread_only === 'true'
  );

  paginated(res, notifications, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 获取未读通知数
 * GET /api/notifications/unread-count
 * 需要登录
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const count = await notificationService.getUnreadCount(userId);
  success(res, { count }, '获取成功');
});

/**
 * 标记通知为已读
 * POST /api/notifications/:id/read
 * 需要登录
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await notificationService.markAsRead(Number(id), userId);
  success(res, null, '标记成功');
});

/**
 * 标记所有通知为已读
 * POST /api/notifications/read-all
 * 需要登录
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  await notificationService.markAllAsRead(userId);
  success(res, null, '全部标记成功');
});

/**
 * 删除通知
 * DELETE /api/notifications/:id
 * 需要登录
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await notificationService.deleteNotification(Number(id), userId);
  success(res, null, '删除成功');
});

/**
 * 创建举报
 * POST /api/reports
 * 需要登录
 */
export const createReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reporterId = req.user!.userId;
  const { target_type, target_id, reason, description, images } = req.body;

  const validTargetTypes = ['user', 'item', 'resource', 'message'];
  if (!validTargetTypes.includes(target_type)) {
    error(res, '无效的举报目标类型');
    return;
  }

  if (isEmpty(target_id)) {
    error(res, '举报目标ID不能为空');
    return;
  }

  if (isEmpty(reason)) {
    error(res, '举报原因不能为空');
    return;
  }

  if (reason.length > 255) {
    error(res, '举报原因不能超过255个字符');
    return;
  }

  const reportId = await notificationService.createReport(reporterId, {
    target_type, target_id, reason, description, images,
  });

  success(res, { id: reportId }, '举报成功，我们会尽快处理');
});

/**
 * 获取我的举报列表
 * GET /api/reports/my
 * 需要登录
 */
export const getMyReports = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 10 } = req.query;

  const { reports, total } = await notificationService.getUserReports(
    userId, Number(page), Number(page_size)
  );

  paginated(res, reports, total, Number(page), Number(page_size), '获取成功');
});

// 导出所有控制器方法
export default {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  deleteNotification, createReport, getMyReports,
};
