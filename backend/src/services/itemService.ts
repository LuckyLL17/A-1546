/**
 * 物品服务模块
 * 处理二手物品相关的业务逻辑，包括发布、编辑、搜索、收藏等
 */

import { v4 as uuidv4 } from 'uuid';
import { query, execute, getConnection } from '../utils/database';
import {
  Item,
  CreateItemParams,
  UpdateItemParams,
  SearchItemParams,
  Category,
} from '../types';
import { RowDataPacket } from 'mysql2';
import { AppError, ErrorCode, assertRequiredId } from '../utils/errors';
import logger from '../utils/logger';

/**
 * 创建新物品
 * 
 * @param sellerId - 卖家用户ID
 * @param params - 创建物品参数
 * @returns 返回新创建的物品ID
 */
export const createItem = async (
  sellerId: string,
  params: CreateItemParams
): Promise<string> => {
  assertRequiredId(sellerId, '卖家ID');
  const {
    category_id,
    title,
    description,
    original_price,
    price,
    condition_level = 'good',
    images,
    location,
  } = params;
  
  // 生成物品ID
  const itemId = uuidv4();
  
  // 将图片数组转换为JSON字符串存储
  const imagesJson = images ? JSON.stringify(images) : null;
  
  // 插入物品记录
  await execute(
    `INSERT INTO items 
     (id, seller_id, category_id, title, description, original_price, price, condition_level, images, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      itemId,
      sellerId,
      category_id || null,
      title,
      description || null,
      original_price || null,
      price,
      condition_level,
      imagesJson,
      location || null,
    ]
  );
  
  logger.info('物品创建成功', { itemId, sellerId, title, price, conditionLevel: condition_level });

  return itemId;
};

/**
 * 发布物品（将状态从草稿改为已发布）
 * 
 * @param itemId - 物品ID
 * @param sellerId - 卖家ID（用于权限验证）
 */
export const publishItem = async (
  itemId: string,
  sellerId: string
): Promise<void> => {
  // 检查物品是否存在且属于该卖家
  const item = await getItemById(itemId);
  
  if (item.seller_id !== sellerId) {
    throw AppError.forbidden('无权操作此物品', ErrorCode.FORBIDDEN);
  }
  
  if (item.status !== 'draft') {
    throw AppError.badRequest('只有草稿状态的物品可以发布', ErrorCode.ITEM_NOT_AVAILABLE);
  }
  
  await execute(
    'UPDATE items SET status = "published" WHERE id = ?',
    [itemId]
  );
  
  logger.info('物品发布成功', { itemId, sellerId });
};

/**
 * 根据ID获取物品详情
 * 
 * @param itemId - 物品ID
 * @returns 返回物品详情
 */
export const getItemById = async (itemId: string): Promise<Item> => {
  assertRequiredId(itemId, '物品ID');
  const items = await query<Item>(
    'SELECT * FROM items WHERE id = ?',
    [itemId]
  );
  
  if (items.length === 0) {
    throw AppError.notFound('物品不存在', ErrorCode.ITEM_NOT_FOUND);
  }
  
  return items[0];
};

/**
 * 获取物品详情（包含卖家信息）
 * 同时增加浏览次数
 * 
 * @param itemId - 物品ID
 * @returns 返回物品详情及卖家信息
 */
export const getItemDetail = async (
  itemId: string
): Promise<Item & { seller: { id: string; username: string; avatar?: string; credit_score: number } }> => {
  // 增加浏览次数
  await execute(
    'UPDATE items SET view_count = view_count + 1 WHERE id = ?',
    [itemId]
  );
  
  // 查询物品及卖家信息
  const items = await query<Item & RowDataPacket>(
    `SELECT i.*, 
            u.id as seller_user_id, u.username as seller_username, 
            u.avatar as seller_avatar, u.credit_score as seller_credit_score
     FROM items i
     JOIN users u ON i.seller_id = u.id
     WHERE i.id = ?`,
    [itemId]
  );
  
  if (items.length === 0) {
    throw AppError.notFound('物品不存在', ErrorCode.ITEM_NOT_FOUND);
  }
  
  const item = items[0];
  
  // 构造返回数据
  return {
    ...item,
    seller: {
      id: item.seller_user_id,
      username: item.seller_username,
      avatar: item.seller_avatar,
      credit_score: item.seller_credit_score,
    },
  } as Item & { seller: { id: string; username: string; avatar?: string; credit_score: number } };
};

/**
 * 更新物品信息
 * 
 * @param itemId - 物品ID
 * @param sellerId - 卖家ID（用于权限验证）
 * @param params - 更新参数
 */
export const updateItem = async (
  itemId: string,
  sellerId: string,
  params: UpdateItemParams
): Promise<Item> => {
  // 检查物品是否存在且属于该卖家
  const item = await getItemById(itemId);
  
  if (item.seller_id !== sellerId) {
    throw AppError.forbidden('无权操作此物品', ErrorCode.FORBIDDEN);
  }
  
  // 构建更新SQL
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  if (params.category_id !== undefined) {
    updateFields.push('category_id = ?');
    updateValues.push(params.category_id);
  }
  if (params.title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(params.title);
  }
  if (params.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(params.description);
  }
  if (params.original_price !== undefined) {
    updateFields.push('original_price = ?');
    updateValues.push(params.original_price);
  }
  if (params.price !== undefined) {
    updateFields.push('price = ?');
    updateValues.push(params.price);
  }
  if (params.condition_level !== undefined) {
    updateFields.push('condition_level = ?');
    updateValues.push(params.condition_level);
  }
  if (params.images !== undefined) {
    updateFields.push('images = ?');
    updateValues.push(JSON.stringify(params.images));
  }
  if (params.location !== undefined) {
    updateFields.push('location = ?');
    updateValues.push(params.location);
  }
  if (params.status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(params.status);
  }
  
  if (updateFields.length === 0) {
    return item;
  }
  
  updateValues.push(itemId);
  
  await execute(
    `UPDATE items SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );
  
  return getItemById(itemId);
};

/**
 * 删除物品（实际是将状态改为removed）
 * 
 * @param itemId - 物品ID
 * @param sellerId - 卖家ID
 */
export const deleteItem = async (
  itemId: string,
  sellerId: string
): Promise<void> => {
  const item = await getItemById(itemId);
  
  if (item.seller_id !== sellerId) {
    throw AppError.forbidden('无权操作此物品', ErrorCode.FORBIDDEN);
  }
  
  await execute(
    'UPDATE items SET status = "removed" WHERE id = ?',
    [itemId]
  );
  
  logger.info('物品删除成功', { itemId, sellerId });
};

/**
 * 搜索物品
 * 支持关键词、分类、价格范围等多条件搜索
 * 
 * @param params - 搜索参数
 * @returns 返回物品列表和总数
 */
export const searchItems = async (
  params: SearchItemParams
): Promise<{ items: Item[]; total: number }> => {
  const {
    keyword,
    category_id,
    min_price,
    max_price,
    condition_level,
    school,
    sort_by = 'time_desc',
    page = 1,
    page_size = 10,
  } = params;
  
  // 构建WHERE条件
  const conditions: string[] = ['i.status = "published"'];
  const values: any[] = [];
  
  // 关键词搜索（标题和描述）
  if (keyword) {
    conditions.push('(i.title LIKE ? OR i.description LIKE ?)');
    const keywordPattern = `%${keyword}%`;
    values.push(keywordPattern, keywordPattern);
  }
  
  // 分类筛选（包含子分类）
  if (category_id) {
    conditions.push('(i.category_id = ? OR i.category_id IN (SELECT id FROM categories WHERE parent_id = ?))');
    values.push(category_id, category_id);
  }
  
  // 价格范围
  if (min_price !== undefined) {
    conditions.push('i.price >= ?');
    values.push(min_price);
  }
  if (max_price !== undefined) {
    conditions.push('i.price <= ?');
    values.push(max_price);
  }
  
  // 新旧程度
  if (condition_level) {
    conditions.push('i.condition_level = ?');
    values.push(condition_level);
  }
  
  // 学校筛选
  if (school) {
    conditions.push('u.school = ?');
    values.push(school);
  }
  
  // 构建WHERE子句
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // 排序
  let orderClause = 'ORDER BY ';
  switch (sort_by) {
    case 'price_asc':
      orderClause += 'i.price ASC';
      break;
    case 'price_desc':
      orderClause += 'i.price DESC';
      break;
    case 'time_asc':
      orderClause += 'i.created_at ASC';
      break;
    case 'time_desc':
    default:
      orderClause += 'i.created_at DESC';
  }
  
  // 计算偏移量
  const offset = (page - 1) * page_size;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total 
     FROM items i 
     LEFT JOIN users u ON i.seller_id = u.id 
     ${whereClause}`,
    values
  );
  const total = countResult[0].total;
  
  // 查询物品列表
  const items = await query<Item>(
    `SELECT i.*, u.username as seller_username, u.avatar as seller_avatar
     FROM items i
     LEFT JOIN users u ON i.seller_id = u.id
     ${whereClause}
     ${orderClause}
     LIMIT ? OFFSET ?`,
    [...values, page_size, offset]
  );
  
  return { items, total };
};

/**
 * 获取用户发布的物品列表
 * 
 * @param userId - 用户ID
 * @param status - 物品状态筛选（可选）
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserItems = async (
  userId: string,
  status?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: Item[]; total: number }> => {
  const conditions: string[] = ['seller_id = ?'];
  const values: any[] = [userId];
  
  // 排除已删除的物品
  conditions.push('status != "removed"');
  
  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total FROM items ${whereClause}`,
    values
  );
  const total = countResult[0].total;
  
  // 查询物品列表
  const items = await query<Item>(
    `SELECT * FROM items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  
  return { items, total };
};

/**
 * 收藏物品
 * 
 * @param userId - 用户ID
 * @param itemId - 物品ID
 */
export const favoriteItem = async (
  userId: string,
  itemId: string
): Promise<void> => {
  assertRequiredId(userId, '用户ID');
  assertRequiredId(itemId, '物品ID');
  // 检查物品是否存在
  await getItemById(itemId);
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 检查是否已收藏
    const existing = await connection.execute(
      'SELECT id FROM item_favorites WHERE user_id = ? AND item_id = ?',
      [userId, itemId]
    );
    
    if ((existing[0] as any[]).length > 0) {
      throw AppError.badRequest('已收藏该物品', ErrorCode.ITEM_ALREADY_FAVORITED);
    }
    
    // 添加收藏记录
    await connection.execute(
      'INSERT INTO item_favorites (user_id, item_id) VALUES (?, ?)',
      [userId, itemId]
    );
    
    // 更新物品收藏数
    await connection.execute(
      'UPDATE items SET like_count = like_count + 1 WHERE id = ?',
      [itemId]
    );
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 取消收藏物品
 * 
 * @param userId - 用户ID
 * @param itemId - 物品ID
 */
export const unfavoriteItem = async (
  userId: string,
  itemId: string
): Promise<void> => {
  assertRequiredId(userId, '用户ID');
  assertRequiredId(itemId, '物品ID');
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 删除收藏记录
    const result = await connection.execute(
      'DELETE FROM item_favorites WHERE user_id = ? AND item_id = ?',
      [userId, itemId]
    );
    
    if ((result[0] as any).affectedRows === 0) {
      throw AppError.badRequest('未收藏该物品', ErrorCode.ITEM_NOT_FAVORITED);
    }
    
    // 更新物品收藏数
    await connection.execute(
      'UPDATE items SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
      [itemId]
    );
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 获取用户收藏的物品列表
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserFavorites = async (
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: Item[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(*) as total FROM item_favorites WHERE user_id = ?',
    [userId]
  );
  const total = countResult[0].total;
  
  // 查询收藏的物品
  const items = await query<Item>(
    `SELECT i.*, f.created_at as favorite_time
     FROM item_favorites f
     JOIN items i ON f.item_id = i.id
     WHERE f.user_id = ? AND i.status != 'removed'
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  
  return { items, total };
};

/**
 * 获取所有分类
 * 
 * @returns 返回分类列表（树形结构）
 */
export const getCategories = async (): Promise<Category[]> => {
  const categories = await query<Category>(
    'SELECT * FROM categories WHERE status = "active" ORDER BY sort_order, id'
  );
  
  return categories;
};

/**
 * 检查用户是否已收藏某物品
 * 
 * @param userId - 用户ID
 * @param itemId - 物品ID
 * @returns 是否已收藏
 */
export const isFavorited = async (
  userId: string,
  itemId: string
): Promise<boolean> => {
  const result = await query<RowDataPacket>(
    'SELECT id FROM item_favorites WHERE user_id = ? AND item_id = ?',
    [userId, itemId]
  );
  return result.length > 0;
};

// 导出所有服务方法
export default {
  createItem,
  publishItem,
  getItemById,
  getItemDetail,
  updateItem,
  deleteItem,
  searchItems,
  getUserItems,
  favoriteItem,
  unfavoriteItem,
  getUserFavorites,
  getCategories,
  isFavorited,
};
