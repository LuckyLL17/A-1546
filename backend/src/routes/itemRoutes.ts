/**
 * 物品路由模块
 * 定义物品相关的API路由
 */

import { Router } from 'express';
import * as itemController from '../controllers/itemController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// =====================================================
// 公开接口
// =====================================================

/**
 * 搜索物品
 * GET /api/items
 * Query: { keyword?, category_id?, min_price?, max_price?, condition_level?, school?, sort_by?, page?, page_size? }
 */
router.get('/', itemController.searchItems);

/**
 * 获取分类列表
 * GET /api/items/categories
 */
router.get('/categories', itemController.getCategories);

// =====================================================
// 需要登录的接口（放在 /:id 之前，避免被拦截）
// =====================================================

/**
 * 获取我发布的物品
 * GET /api/items/my/list
 * Query: { status?, page?, page_size? }
 */
router.get('/my/list', authMiddleware, itemController.getMyItems);

/**
 * 获取我的收藏列表
 * GET /api/items/my/favorites
 * Query: { page?, page_size? }
 */
router.get('/my/favorites', authMiddleware, itemController.getMyFavorites);

// =====================================================
// 带参数的接口（放在最后）
// =====================================================

/**
 * 获取物品详情
 * GET /api/items/:id
 * 可选登录：登录后会返回是否已收藏
 */
router.get('/:id', optionalAuthMiddleware, itemController.getItemDetail);

/**
 * 创建物品
 * POST /api/items
 * Body: { category_id?, title, description?, original_price?, price, condition_level?, images?, location? }
 */
router.post('/', authMiddleware, itemController.createItem);

/**
 * 发布物品
 * POST /api/items/:id/publish
 */
router.post('/:id/publish', authMiddleware, itemController.publishItem);

/**
 * 更新物品
 * PUT /api/items/:id
 * Body: { category_id?, title?, description?, original_price?, price?, condition_level?, images?, location?, status? }
 */
router.put('/:id', authMiddleware, itemController.updateItem);

/**
 * 删除物品
 * DELETE /api/items/:id
 */
router.delete('/:id', authMiddleware, itemController.deleteItem);

/**
 * 收藏物品
 * POST /api/items/:id/favorite
 */
router.post('/:id/favorite', authMiddleware, itemController.favoriteItem);

/**
 * 取消收藏
 * DELETE /api/items/:id/favorite
 */
router.delete('/:id/favorite', authMiddleware, itemController.unfavoriteItem);

export default router;
