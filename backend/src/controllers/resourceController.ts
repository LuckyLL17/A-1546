/**
 * 资源控制器模块
 * 处理共享资源相关的HTTP请求
 */

import { Request, Response } from 'express';
import * as resourceService from '../services/resourceService';
import { success, error, paginated } from '../utils/response';
import { isEmpty, isValidUUID } from '../utils/validator';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * 创建资源
 * POST /api/resources
 * 需要登录
 */
export const createResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { title, description, resource_type, file_url, file_size, tags, is_free, points_required } = req.body;

  if (isEmpty(title)) {
    error(res, '资源标题不能为空');
    return;
  }

  if (title.length > 100) {
    error(res, '资源标题不能超过100个字符');
    return;
  }

  const validTypes = ['document', 'video', 'tool', 'other'];
  if (resource_type && !validTypes.includes(resource_type)) {
    error(res, '无效的资源类型');
    return;
  }

  const resourceId = await resourceService.createResource(userId, {
    title, description, resource_type, file_url, file_size, tags, is_free, points_required,
  });

  success(res, { id: resourceId }, '创建成功，请发布后对外可见');
});

/**
 * 获取资源详情
 * GET /api/resources/:id
 */
export const getResourceDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  const resource = await resourceService.getResourceDetail(id);
  success(res, resource, '获取成功');
});

/**
 * 更新资源
 * PUT /api/resources/:id
 * 需要登录
 */
export const updateResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const updateParams = req.body;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  const updatedResource = await resourceService.updateResource(id, userId, updateParams);
  success(res, updatedResource, '更新成功');
});

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 需要登录
 */
export const deleteResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  await resourceService.deleteResource(id, userId);
  success(res, null, '删除成功');
});

/**
 * 发布资源
 * POST /api/resources/:id/publish
 * 需要登录（仅资源所有者）
 */
export const publishResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  await resourceService.publishResource(id, userId);
  success(res, null, '发布成功');
});

/**
 * 搜索资源
 * GET /api/resources
 */
export const searchResources = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    keyword, resource_type, is_free, tags, sort_by, page = 1, page_size = 10,
  } = req.query;

  const searchParams = {
    keyword: keyword as string,
    resource_type: resource_type as any,
    is_free: is_free !== undefined ? is_free === 'true' : undefined,
    tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
    sort_by: sort_by as any,
    page: Number(page),
    page_size: Math.min(Number(page_size), 50),
  };

  const { resources, total } = await resourceService.searchResources(searchParams);
  paginated(res, resources, total, searchParams.page, searchParams.page_size, '获取成功');
});

/**
 * 获取我发布的资源
 * GET /api/resources/my
 * 需要登录
 */
export const getMyResources = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 10 } = req.query;

  const { resources, total } = await resourceService.getUserResources(
    userId, Number(page), Number(page_size)
  );

  paginated(res, resources, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 下载资源
 * POST /api/resources/:id/download
 * 需要登录
 */
export const downloadResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  const fileUrl = await resourceService.downloadResource(id, userId);
  success(res, { file_url: fileUrl }, '获取下载链接成功');
});

/**
 * 点赞资源
 * POST /api/resources/:id/like
 */
export const likeResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的资源ID');
    return;
  }

  await resourceService.likeResource(id);
  success(res, null, '点赞成功');
});

/**
 * 获取我的下载记录
 * GET /api/resources/downloads
 * 需要登录
 */
export const getMyDownloads = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 10 } = req.query;

  const { resources, total } = await resourceService.getUserDownloads(
    userId, Number(page), Number(page_size)
  );

  paginated(res, resources, total, Number(page), Number(page_size), '获取成功');
});

// 导出所有控制器方法
export default {
  createResource, getResourceDetail, updateResource, deleteResource,
  publishResource,
  searchResources, getMyResources, downloadResource, likeResource, getMyDownloads,
};
