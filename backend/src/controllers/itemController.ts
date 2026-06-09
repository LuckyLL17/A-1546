/**
 * 物品控制器模块
 * 处理物品相关的HTTP请求
 */

import { Request, Response } from 'express';
import * as itemService from '../services/itemService';
import { success, error, paginated } from '../utils/response';
import { isEmpty, isValidPrice, isValidUUID } from '../utils/validator';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * 创建物品
 * POST /api/items
 * 需要登录
 */
export const createItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const { category_id, title, description, original_price, price, condition_level, images, location } = req.body;

  if (isEmpty(title)) {
    error(res, '物品标题不能为空');
    return;
  }

  if (title.length > 100) {
    error(res, '物品标题不能超过100个字符');
    return;
  }

  if (price === undefined || price === null) {
    error(res, '物品价格不能为空');
    return;
  }

  if (!isValidPrice(Number(price))) {
    error(res, '价格格式不正确');
    return;
  }

  if (original_price !== undefined && !isValidPrice(Number(original_price))) {
    error(res, '原价格式不正确');
    return;
  }

  const validConditions = ['new', 'like_new', 'good', 'fair', 'poor'];
  if (condition_level && !validConditions.includes(condition_level)) {
    error(res, '新旧程度参数不正确');
    return;
  }

  const itemId = await itemService.createItem(sellerId, {
    category_id, title, description, original_price, price, condition_level, images, location,
  });

  success(res, { id: itemId }, '创建成功');
});

/**
 * 发布物品
 * POST /api/items/:id/publish
 * 需要登录
 */
export const publishItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  await itemService.publishItem(id, sellerId);
  success(res, null, '发布成功');
});

/**
 * 获取物品详情
 * GET /api/items/:id
 */
export const getItemDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  const item = await itemService.getItemDetail(id);

  let isFavorited = false;
  if (req.user) {
    isFavorited = await itemService.isFavorited(req.user.userId, id);
  }

  success(res, { ...item, is_favorited: isFavorited }, '获取成功');
});

/**
 * 更新物品信息
 * PUT /api/items/:id
 * 需要登录
 */
export const updateItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const { id } = req.params;
  const updateParams = req.body;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  if (updateParams.price !== undefined && !isValidPrice(Number(updateParams.price))) {
    error(res, '价格格式不正确');
    return;
  }

  if (updateParams.original_price !== undefined && !isValidPrice(Number(updateParams.original_price))) {
    error(res, '原价格式不正确');
    return;
  }

  const updatedItem = await itemService.updateItem(id, sellerId, updateParams);
  success(res, updatedItem, '更新成功');
});

/**
 * 删除物品
 * DELETE /api/items/:id
 * 需要登录
 */
export const deleteItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  await itemService.deleteItem(id, sellerId);
  success(res, null, '删除成功');
});

/**
 * 搜索物品
 * GET /api/items
 */
export const searchItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    keyword, category_id, min_price, max_price,
    condition_level, school, sort_by, page = 1, page_size = 10,
  } = req.query;

  const searchParams = {
    keyword: keyword as string,
    category_id: category_id ? Number(category_id) : undefined,
    min_price: min_price ? Number(min_price) : undefined,
    max_price: max_price ? Number(max_price) : undefined,
    condition_level: condition_level as any,
    school: school as string,
    sort_by: sort_by as any,
    page: Number(page),
    page_size: Math.min(Number(page_size), 50),
  };

  const { items, total } = await itemService.searchItems(searchParams);
  paginated(res, items, total, searchParams.page, searchParams.page_size, '获取成功');
});

/**
 * 获取我发布的物品
 * GET /api/items/my
 * 需要登录
 */
export const getMyItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { status, page = 1, page_size = 10 } = req.query;

  const { items, total } = await itemService.getUserItems(
    userId, status as string, Number(page), Number(page_size)
  );

  paginated(res, items, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 收藏物品
 * POST /api/items/:id/favorite
 * 需要登录
 */
export const favoriteItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  await itemService.favoriteItem(userId, id);
  success(res, null, '收藏成功');
});

/**
 * 取消收藏
 * DELETE /api/items/:id/favorite
 * 需要登录
 */
export const unfavoriteItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidUUID(id)) {
    error(res, '无效的物品ID');
    return;
  }

  await itemService.unfavoriteItem(userId, id);
  success(res, null, '取消收藏成功');
});

/**
 * 获取我的收藏列表
 * GET /api/items/favorites
 * 需要登录
 */
export const getMyFavorites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { page = 1, page_size = 10 } = req.query;

  const { items, total } = await itemService.getUserFavorites(
    userId, Number(page), Number(page_size)
  );

  paginated(res, items, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 获取分类列表
 * GET /api/categories
 */
export const getCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await itemService.getCategories();

  const categoryMap = new Map();
  const rootCategories: any[] = [];

  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach(cat => {
    const category = categoryMap.get(cat.id);
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  success(res, rootCategories, '获取成功');
});

// 导出所有控制器方法
export default {
  createItem, publishItem, getItemDetail, updateItem, deleteItem,
  searchItems, getMyItems, favoriteItem, unfavoriteItem, getMyFavorites, getCategories,
};
