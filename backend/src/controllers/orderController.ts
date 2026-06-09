/**
 * 订单控制器模块
 * 处理订单相关的HTTP请求
 */

import { Request, Response } from 'express';
import * as orderService from '../services/orderService';
import { success, error, paginated } from '../utils/response';
import { isEmpty, isValidUUID, isValidOrderId, isValidRating } from '../utils/validator';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * 创建订单
 * POST /api/orders
 * 需要登录
 */
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.userId;
  const { item_id, delivery_method, delivery_address, remark } = req.body;

  if (isEmpty(item_id)) {
    error(res, '物品ID不能为空');
    return;
  }

  if (!isValidUUID(item_id)) {
    error(res, '无效的物品ID');
    return;
  }

  const validDeliveryMethods = ['face_to_face', 'express', 'self_pickup'];
  if (delivery_method && !validDeliveryMethods.includes(delivery_method)) {
    error(res, '无效的交付方式');
    return;
  }

  const result = await orderService.createOrder(buyerId, {
    item_id, delivery_method, delivery_address, remark,
  });

  success(res, result, '下单成功');
});

/**
 * 获取订单详情
 * GET /api/orders/:id
 * 需要登录
 */
export const getOrderDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  const order = await orderService.getOrderDetail(id, userId);
  const reviews = await orderService.getOrderReviews(id);

  success(res, { ...order, reviews }, '获取成功');
});

/**
 * 支付订单
 * POST /api/orders/:id/pay
 * 需要登录
 */
export const payOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.userId;
  const { id } = req.params;
  const { payment_method } = req.body;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  if (isEmpty(payment_method)) {
    error(res, '支付方式不能为空');
    return;
  }

  await orderService.payOrder(id, buyerId, payment_method);
  success(res, null, '支付成功');
});

/**
 * 发货
 * POST /api/orders/:id/ship
 * 需要登录（卖家）
 */
export const shipOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sellerId = req.user!.userId;
  const { id } = req.params;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  await orderService.shipOrder(id, sellerId);
  success(res, null, '发货成功');
});

/**
 * 确认收货
 * POST /api/orders/:id/complete
 * 需要登录（买家）
 */
export const completeOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.userId;
  const { id } = req.params;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  await orderService.completeOrder(id, buyerId);
  success(res, null, '确认收货成功');
});

/**
 * 取消订单
 * POST /api/orders/:id/cancel
 * 需要登录
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  await orderService.cancelOrder(id, userId);
  success(res, null, '取消成功');
});

/**
 * 获取我的订单（作为买家）
 * GET /api/orders/buyer
 * 需要登录
 */
export const getBuyerOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { status, page = 1, page_size = 10 } = req.query;

  const { orders, total } = await orderService.getUserOrders(
    userId, 'buyer', status as string, Number(page), Number(page_size)
  );

  paginated(res, orders, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 获取我的订单（作为卖家）
 * GET /api/orders/seller
 * 需要登录
 */
export const getSellerOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { status, page = 1, page_size = 10 } = req.query;

  const { orders, total } = await orderService.getUserOrders(
    userId, 'seller', status as string, Number(page), Number(page_size)
  );

  paginated(res, orders, total, Number(page), Number(page_size), '获取成功');
});

/**
 * 创建评价
 * POST /api/orders/:id/review
 * 需要登录
 */
export const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reviewerId = req.user!.userId;
  const { id } = req.params;
  const { rating, content, images, is_anonymous } = req.body;

  if (!isValidOrderId(id)) {
    error(res, '无效的订单ID或订单号');
    return;
  }

  if (rating === undefined || rating === null) {
    error(res, '评分不能为空');
    return;
  }

  if (!isValidRating(Number(rating))) {
    error(res, '评分必须是1-5的整数');
    return;
  }

  const reviewId = await orderService.createReview(reviewerId, {
    order_id: id, rating: Number(rating), content, images, is_anonymous,
  });

  success(res, { id: reviewId }, '评价成功');
});

/**
 * 获取用户收到的评价
 * GET /api/users/:id/reviews
 */
export const getUserReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, page_size = 10 } = req.query;

  if (!isValidUUID(id)) {
    error(res, '无效的用户ID');
    return;
  }

  const { reviews, total } = await orderService.getUserReviews(
    id, Number(page), Number(page_size)
  );

  paginated(res, reviews, total, Number(page), Number(page_size), '获取成功');
});

// 导出所有控制器方法
export default {
  createOrder, getOrderDetail, payOrder, shipOrder, completeOrder,
  cancelOrder, getBuyerOrders, getSellerOrders, createReview, getUserReviews,
};
