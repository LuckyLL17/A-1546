/**
 * 资源路由模块
 * 定义共享资源相关的API路由
 */

import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// =====================================================
// 公开接口
// =====================================================

/**
 * 搜索资源
 * GET /api/resources
 * Query: { keyword?, resource_type?, is_free?, tags?, sort_by?, page?, page_size? }
 */
router.get('/', resourceController.searchResources);

// =====================================================
// 需要登录的接口（放在 /:id 之前，避免被拦截）
// =====================================================

/**
 * 获取我发布的资源
 * GET /api/resources/my/list
 * Query: { page?, page_size? }
 */
router.get('/my/list', authMiddleware, resourceController.getMyResources);

/**
 * 获取我的下载记录
 * GET /api/resources/my/downloads
 * Query: { page?, page_size? }
 */
router.get('/my/downloads', authMiddleware, resourceController.getMyDownloads);

// =====================================================
// 带参数的接口（放在最后）
// =====================================================

/**
 * 获取资源详情
 * GET /api/resources/:id
 */
router.get('/:id', resourceController.getResourceDetail);

/**
 * 点赞资源
 * POST /api/resources/:id/like
 */
router.post('/:id/like', resourceController.likeResource);

/**
 * 创建资源
 * POST /api/resources
 * Body: { title, description?, resource_type?, file_url?, file_size?, tags?, is_free?, points_required? }
 */
router.post('/', authMiddleware, resourceController.createResource);

/**
 * 更新资源
 * PUT /api/resources/:id
 */
router.put('/:id', authMiddleware, resourceController.updateResource);

/**
 * 删除资源
 * DELETE /api/resources/:id
 */
router.delete('/:id', authMiddleware, resourceController.deleteResource);

/**
 * 发布资源
 * POST /api/resources/:id/publish
 */
router.post('/:id/publish', authMiddleware, resourceController.publishResource);

/**
 * 下载资源
 * POST /api/resources/:id/download
 */
router.post('/:id/download', authMiddleware, resourceController.downloadResource);

export default router;
