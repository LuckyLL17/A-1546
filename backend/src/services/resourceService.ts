/**
 * 资源共享服务模块
 * 处理共享资源相关的业务逻辑，包括资源发布、下载、搜索等
 */

import { v4 as uuidv4 } from 'uuid';
import { query, execute, getConnection } from '../utils/database';
import { SharedResource, CreateResourceParams, UpdateResourceParams, SearchResourceParams } from '../types';
import { RowDataPacket } from 'mysql2';
import { AppError, ErrorCode, assertRequiredId } from '../utils/errors';
import logger from '../utils/logger';

/**
 * 创建共享资源
 * 
 * @param userId - 分享者用户ID
 * @param params - 创建资源参数
 * @returns 返回新资源的ID
 */
export const createResource = async (
  userId: string,
  params: CreateResourceParams
): Promise<string> => {
  assertRequiredId(userId, '用户ID');
  const {
    title,
    description,
    resource_type = 'other',
    file_url,
    file_size,
    tags,
    is_free = true,
    points_required = 0,
  } = params;
  
  const resourceId = uuidv4();
  
  // 将标签数组转换为JSON字符串
  const tagsJson = tags ? JSON.stringify(tags) : null;
  
  await execute(
    `INSERT INTO shared_resources 
     (id, user_id, title, description, resource_type, file_url, file_size, tags, is_free, points_required, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      resourceId,
      userId,
      title,
      description || null,
      resource_type,
      file_url || null,
      file_size || null,
      tagsJson,
      is_free ? 1 : 0,
      is_free ? 0 : points_required,
    ]
  );
  
  logger.info('资源创建成功', { resourceId, userId, title, resourceType: resource_type, isFree: is_free });

  return resourceId;
};

/**
 * 根据ID获取资源详情
 * 
 * @param resourceId - 资源ID
 * @returns 返回资源详情
 */
export const getResourceById = async (resourceId: string): Promise<SharedResource> => {
  assertRequiredId(resourceId, '资源ID');
  const resources = await query<SharedResource>(
    'SELECT * FROM shared_resources WHERE id = ?',
    [resourceId]
  );
  
  if (resources.length === 0) {
    throw AppError.notFound('资源不存在', ErrorCode.RESOURCE_NOT_FOUND);
  }
  
  return resources[0];
};

/**
 * 获取资源详情（包含分享者信息）
 * 
 * @param resourceId - 资源ID
 * @returns 返回资源详情及分享者信息
 */
export const getResourceDetail = async (
  resourceId: string
): Promise<SharedResource & { uploader: { id: string; username: string; avatar?: string } }> => {
  const resources = await query<SharedResource & RowDataPacket>(
    `SELECT r.*, u.id as uploader_id, u.username as uploader_username, u.avatar as uploader_avatar
     FROM shared_resources r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`,
    [resourceId]
  );
  
  if (resources.length === 0) {
    throw AppError.notFound('资源不存在', ErrorCode.RESOURCE_NOT_FOUND);
  }
  
  const resource = resources[0];
  
  return {
    ...resource,
    uploader: {
      id: resource.uploader_id,
      username: resource.uploader_username,
      avatar: resource.uploader_avatar,
    },
  } as SharedResource & { uploader: { id: string; username: string; avatar?: string } };
};

/**
 * 更新资源信息
 * 
 * @param resourceId - 资源ID
 * @param userId - 用户ID（用于权限验证）
 * @param params - 更新参数
 */
export const updateResource = async (
  resourceId: string,
  userId: string,
  params: UpdateResourceParams
): Promise<SharedResource> => {
  assertRequiredId(resourceId, '资源ID');
  assertRequiredId(userId, '用户ID');
  const resource = await getResourceById(resourceId);
  
  if (resource.user_id !== userId) {
    throw AppError.forbidden('无权操作此资源', ErrorCode.FORBIDDEN);
  }
  
  // 构建更新SQL
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  if (params.title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(params.title);
  }
  if (params.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(params.description);
  }
  if (params.resource_type !== undefined) {
    updateFields.push('resource_type = ?');
    updateValues.push(params.resource_type);
  }
  if (params.file_url !== undefined) {
    updateFields.push('file_url = ?');
    updateValues.push(params.file_url);
  }
  if (params.tags !== undefined) {
    updateFields.push('tags = ?');
    updateValues.push(JSON.stringify(params.tags));
  }
  if (params.is_free !== undefined) {
    updateFields.push('is_free = ?');
    updateValues.push(params.is_free ? 1 : 0);
  }
  if (params.points_required !== undefined) {
    updateFields.push('points_required = ?');
    updateValues.push(params.points_required);
  }
  
  if (updateFields.length === 0) {
    return resource;
  }
  
  updateValues.push(resourceId);
  
  await execute(
    `UPDATE shared_resources SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );
  
  logger.info('资源更新成功', { resourceId, userId, updatedFields: Object.keys(params) });

  return getResourceById(resourceId);
};

/**
 * 删除资源
 * 
 * @param resourceId - 资源ID
 * @param userId - 用户ID
 */
export const deleteResource = async (
  resourceId: string,
  userId: string
): Promise<void> => {
  assertRequiredId(resourceId, '资源ID');
  assertRequiredId(userId, '用户ID');
  const resource = await getResourceById(resourceId);
  
  if (resource.user_id !== userId) {
    throw AppError.forbidden('无权操作此资源', ErrorCode.FORBIDDEN);
  }
  
  await execute(
    'UPDATE shared_resources SET status = "removed" WHERE id = ?',
    [resourceId]
  );
  
  logger.info('资源删除成功', { resourceId, userId });
};

export const publishResource = async (
  resourceId: string,
  userId: string
): Promise<void> => {
  assertRequiredId(resourceId, '资源ID');
  assertRequiredId(userId, '用户ID');

  const resource = await getResourceById(resourceId);

  if (resource.user_id !== userId) {
    throw AppError.forbidden('无权操作此资源', ErrorCode.FORBIDDEN);
  }

  if (resource.status === 'removed') {
    throw AppError.badRequest('已删除的资源不能发布', ErrorCode.RESOURCE_UNAVAILABLE);
  }

  if (resource.status === 'approved') {
    return;
  }

  await execute(
    'UPDATE shared_resources SET status = "approved" WHERE id = ?',
    [resourceId]
  );

  logger.info('资源发布成功', { resourceId, userId });
};

/**
 * 搜索资源
 * 
 * @param params - 搜索参数
 * @returns 返回资源列表和总数
 */
export const searchResources = async (
  params: SearchResourceParams
): Promise<{ resources: SharedResource[]; total: number }> => {
  const {
    keyword,
    resource_type,
    is_free,
    tags,
    sort_by = 'time_desc',
    page = 1,
    page_size = 10,
  } = params;
  
  // 构建WHERE条件
  const conditions: string[] = ['r.status = "approved"'];
  const values: any[] = [];
  
  // 关键词搜索
  if (keyword) {
    conditions.push('(r.title LIKE ? OR r.description LIKE ?)');
    const keywordPattern = `%${keyword}%`;
    values.push(keywordPattern, keywordPattern);
  }
  
  // 资源类型
  if (resource_type) {
    conditions.push('r.resource_type = ?');
    values.push(resource_type);
  }
  
  // 是否免费
  if (is_free !== undefined) {
    conditions.push('r.is_free = ?');
    values.push(is_free ? 1 : 0);
  }
  
  // 标签搜索（使用JSON搜索）
  if (tags && tags.length > 0) {
    // 搜索tags JSON数组中是否包含指定标签
    const tagConditions = tags.map(() => 'JSON_CONTAINS(r.tags, ?)');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    tags.forEach(tag => values.push(JSON.stringify(tag)));
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // 排序
  let orderClause = 'ORDER BY ';
  switch (sort_by) {
    case 'download_desc':
      orderClause += 'r.download_count DESC';
      break;
    case 'like_desc':
      orderClause += 'r.like_count DESC';
      break;
    case 'time_desc':
    default:
      orderClause += 'r.created_at DESC';
  }
  
  const offset = (page - 1) * page_size;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total FROM shared_resources r ${whereClause}`,
    values
  );
  const total = countResult[0].total;
  
  // 查询资源列表
  const resources = await query<SharedResource>(
    `SELECT r.*, u.username as uploader_username
     FROM shared_resources r
     LEFT JOIN users u ON r.user_id = u.id
     ${whereClause}
     ${orderClause}
     LIMIT ? OFFSET ?`,
    [...values, page_size, offset]
  );
  
  return { resources, total };
};

/**
 * 获取用户发布的资源列表
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserResources = async (
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ resources: SharedResource[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(*) as total FROM shared_resources WHERE user_id = ? AND status != "removed"',
    [userId]
  );
  const total = countResult[0].total;
  
  // 查询资源列表
  const resources = await query<SharedResource>(
    `SELECT * FROM shared_resources 
     WHERE user_id = ? AND status != 'removed'
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  
  return { resources, total };
};

/**
 * 下载资源
 * 记录下载并增加下载次数
 * 
 * @param resourceId - 资源ID
 * @param userId - 下载用户ID
 * @returns 返回资源的文件URL
 */
export const downloadResource = async (
  resourceId: string,
  userId: string
): Promise<string> => {
  assertRequiredId(resourceId, '资源ID');
  assertRequiredId(userId, '用户ID');
  const resource = await getResourceById(resourceId);
  
  // 检查资源状态
  if (resource.status !== 'approved') {
    throw AppError.badRequest('资源不可用', ErrorCode.RESOURCE_UNAVAILABLE);
  }
  
  // 检查是否需要积分
  if (!resource.is_free && resource.points_required > 0) {
    // 这里可以添加积分扣减逻辑
    // 暂时跳过积分检查
  }
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 记录下载
    await connection.execute(
      'INSERT INTO resource_downloads (resource_id, user_id) VALUES (?, ?)',
      [resourceId, userId]
    );
    
    // 增加下载次数
    await connection.execute(
      'UPDATE shared_resources SET download_count = download_count + 1 WHERE id = ?',
      [resourceId]
    );
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  
  logger.info('资源下载成功', { resourceId, userId, title: resource.title });

  return resource.file_url || '';
};

/**
 * 点赞资源
 * 
 * @param resourceId - 资源ID
 */
export const likeResource = async (resourceId: string): Promise<void> => {
  await execute(
    'UPDATE shared_resources SET like_count = like_count + 1 WHERE id = ?',
    [resourceId]
  );
};

/**
 * 审核资源（管理员功能）
 * 
 * @param resourceId - 资源ID
 * @param approved - 是否通过
 */
export const reviewResource = async (
  resourceId: string,
  approved: boolean
): Promise<void> => {
  assertRequiredId(resourceId, '资源ID');
  const newStatus = approved ? 'approved' : 'rejected';

  const result = await execute(
    'UPDATE shared_resources SET status = ? WHERE id = ?',
    [newStatus, resourceId]
  );

  const affectedRows = (result as any)?.affectedRows ?? 0;
  if (affectedRows === 0) {
    throw AppError.notFound('资源不存在', ErrorCode.RESOURCE_NOT_FOUND);
  }
};

/**
 * 获取用户的下载记录
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserDownloads = async (
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ resources: SharedResource[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(DISTINCT resource_id) as total FROM resource_downloads WHERE user_id = ?',
    [userId]
  );
  const total = countResult[0].total;
  
  // 查询下载的资源
  const resources = await query<SharedResource>(
    `SELECT r.*, d.created_at as download_time
     FROM resource_downloads d
     JOIN shared_resources r ON d.resource_id = r.id
     WHERE d.user_id = ?
     GROUP BY r.id
     ORDER BY MAX(d.created_at) DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  
  return { resources, total };
};

// 导出所有服务方法
export default {
  createResource,
  getResourceById,
  getResourceDetail,
  updateResource,
  deleteResource,
  searchResources,
  getUserResources,
  publishResource,
  downloadResource,
  likeResource,
  reviewResource,
  getUserDownloads,
};
