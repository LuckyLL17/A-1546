/**
 * 订单路由模块
 * 定义订单相关的API路由
 */

import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有订单接口都需要登录
router.use(authMiddleware);

// =====================================================
// 订单列表
// =====================================================

/**
 * 获取我买入的订单
 * GET /api/orders/buyer
 * Query: { status?, page?, page_size? }
 */
router.get('/buyer', orderController.getBuyerOrders);

/**
 * 获取我卖出的订单
 * GET /api/orders/seller
 * Query: { status?, page?, page_size? }
 */
router.get('/seller', orderController.getSellerOrders);

// =====================================================
// 订单操作
// =====================================================

/**
 * 创建订单
 * POST /api/orders
 * Body: { item_id, delivery_method?, delivery_address?, remark? }
 */
router.post('/', orderController.createOrder);

/**
 * 获取订单详情
 * GET /api/orders/:id
 */
router.get('/:id', orderController.getOrderDetail);

/**
 * 支付订单
 * POST /api/orders/:id/pay
 * Body: { payment_method }
 */
router.post('/:id/pay', orderController.payOrder);

/**
 * 发货
 * POST /api/orders/:id/ship
 */
router.post('/:id/ship', orderController.shipOrder);

/**
 * 确认收货
 * POST /api/orders/:id/complete
 */
router.post('/:id/complete', orderController.completeOrder);

/**
 * 取消订单
 * POST /api/orders/:id/cancel
 */
router.post('/:id/cancel', orderController.cancelOrder);

/**
 * 评价订单
 * POST /api/orders/:id/review
 * Body: { rating, content?, images?, is_anonymous? }
 */
router.post('/:id/review', orderController.createReview);

export default router;
