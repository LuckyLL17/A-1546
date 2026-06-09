/**
 * 订单服务模块
 * 处理交易订单相关的业务逻辑，包括创建订单、支付、发货、确认收货等
 */

import { v4 as uuidv4 } from 'uuid';
import { query, execute, getConnection } from '../utils/database';
import { Order, CreateOrderParams, UpdateOrderParams, Review, CreateReviewParams } from '../types';
import { RowDataPacket } from 'mysql2';
import * as itemService from './itemService';
import * as userService from './userService';
import * as notificationService from './notificationService';
import { AppError, ErrorCode, assertRequiredId } from '../utils/errors';
import logger from '../utils/logger';

/**
 * 生成订单编号
 * 格式：年月日时分秒 + 6位随机数
 * 例如：20231225143052123456
 * 
 * @returns 返回订单编号
 */
const generateOrderNo = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
};

/**
 * 创建订单
 * 买家下单购买物品
 * 
 * @param buyerId - 买家用户ID
 * @param params - 创建订单参数
 * @returns 返回新订单的ID和订单编号
 */
export const createOrder = async (
  buyerId: string,
  params: CreateOrderParams
): Promise<{ orderId: string; orderNo: string }> => {
  assertRequiredId(buyerId, '买家ID');
  const { item_id, delivery_method = 'face_to_face', delivery_address, remark } = params;
  
  // 校验交付方式是否合法
  const validDeliveryMethods = ['face_to_face', 'express', 'self_pickup'];
  if (!validDeliveryMethods.includes(delivery_method)) {
    throw AppError.badRequest('无效的交付方式', ErrorCode.VALIDATION_ERROR);
  }
  
  // 快递配送必须提供收货地址
  if (delivery_method === 'express' && (!delivery_address || delivery_address.trim().length === 0)) {
    throw AppError.badRequest('快递配送必须提供收货地址', ErrorCode.VALIDATION_ERROR);
  }
  
  // 收货地址长度限制
  if (delivery_address && delivery_address.trim().length > 200) {
    throw AppError.badRequest('收货地址不能超过200个字符', ErrorCode.VALIDATION_ERROR);
  }
  
  // 备注长度限制
  if (remark && remark.trim().length > 500) {
    throw AppError.badRequest('备注不能超过500个字符', ErrorCode.VALIDATION_ERROR);
  }
  
  // 获取物品信息
  const item = await itemService.getItemById(item_id);
  
  // 校验物品价格必须为正数
  if (!item.price || item.price <= 0) {
    throw AppError.badRequest('物品价格异常，无法创建订单', ErrorCode.VALIDATION_ERROR);
  }
  
  // 检查物品状态是否可购买
  if (item.status !== 'published') {
    if (item.status === 'draft') {
      throw AppError.badRequest('该物品尚未发布，无法购买', ErrorCode.ITEM_NOT_PUBLISHED);
    } else if (item.status === 'sold') {
      throw AppError.badRequest('该物品已售出', ErrorCode.ITEM_ALREADY_SOLD);
    } else if (item.status === 'removed') {
      throw AppError.badRequest('该物品已下架', ErrorCode.ITEM_ALREADY_REMOVED);
    } else if (item.status === 'reserved') {
      throw AppError.badRequest('该物品已被预订', ErrorCode.ITEM_ALREADY_RESERVED);
    } else {
      throw AppError.badRequest('该物品当前状态不可购买', ErrorCode.ITEM_NOT_AVAILABLE);
    }
  }
  
  // 检查是否是自己的物品
  if (item.seller_id === buyerId) {
    throw AppError.badRequest('不能购买自己的物品', ErrorCode.ORDER_SELF_PURCHASE);
  }
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 生成订单ID和订单编号
    const orderId = uuidv4();
    const orderNo = generateOrderNo();
    
    // 创建订单
    await connection.execute(
      `INSERT INTO orders 
       (id, order_no, item_id, seller_id, buyer_id, price, delivery_method, delivery_address, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNo,
        item_id,
        item.seller_id,
        buyerId,
        item.price,
        delivery_method,
        delivery_address || null,
        remark || null,
      ]
    );
    
    // 将物品状态改为已预订
    await connection.execute(
      'UPDATE items SET status = "reserved" WHERE id = ?',
      [item_id]
    );
    
    await connection.commit();
    
    logger.info('订单创建成功', { orderId, orderNo, buyerId, sellerId: item.seller_id, itemId: item_id, price: item.price, deliveryMethod: delivery_method });

    // 发送通知给卖家：有新订单
    try {
      await notificationService.createNotification(
        item.seller_id,
        '您有新的订单',
        `买家已下单购买您的物品「${item.title}」，订单编号：${orderNo}，请及时处理。`,
        'order',
        orderId
      );
    } catch (notifyError) {
      // 通知发送失败不影响主流程，仅记录错误
      logger.error('发送订单创建通知失败', { error: String(notifyError) });
    }
    
    return { orderId, orderNo };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 根据ID或订单号获取订单详情
 * 支持UUID格式的订单ID或数字格式的订单号
 * 
 * @param orderIdOrNo - 订单ID或订单号
 * @returns 返回订单详情
 */
export const getOrderById = async (orderIdOrNo: string): Promise<Order> => {
  assertRequiredId(orderIdOrNo, '订单ID');
  // 判断是UUID格式还是订单号格式
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNo);
  
  const orders = await query<Order>(
    isUUID ? 'SELECT * FROM orders WHERE id = ?' : 'SELECT * FROM orders WHERE order_no = ?',
    [orderIdOrNo]
  );
  
  if (orders.length === 0) {
    throw AppError.notFound('订单不存在', ErrorCode.ORDER_NOT_FOUND);
  }
  
  return orders[0];
};

/**
 * 获取订单详情（包含物品和用户信息）
 * 
 * @param orderId - 订单ID
 * @param userId - 当前用户ID（用于权限检查）
 */
export const getOrderDetail = async (
  orderId: string,
  userId: string
): Promise<any> => {
  const order = await getOrderById(orderId);
  
  // 检查权限：只有买家或卖家可以查看
  if (order.buyer_id !== userId && order.seller_id !== userId) {
    throw AppError.forbidden('无权查看此订单', ErrorCode.FORBIDDEN);
  }
  
  // 获取物品信息
  const item = await itemService.getItemById(order.item_id);
  
  // 获取买家和卖家信息
  const buyer = await userService.getUserPublicInfo(order.buyer_id);
  const seller = await userService.getUserPublicInfo(order.seller_id);
  
  return {
    ...order,
    item,
    buyer,
    seller,
  };
};

/**
 * 支付订单
 * 
 * @param orderId - 订单ID
 * @param buyerId - 买家ID
 * @param paymentMethod - 支付方式
 */
export const payOrder = async (
  orderIdOrNo: string,
  buyerId: string,
  paymentMethod: string
): Promise<void> => {
  assertRequiredId(orderIdOrNo, '订单ID');
  assertRequiredId(buyerId, '买家ID');
  const order = await getOrderById(orderIdOrNo);
  
  // 检查权限
  if (order.buyer_id !== buyerId) {
    throw AppError.forbidden('无权操作此订单', ErrorCode.FORBIDDEN);
  }
  
  // 检查订单状态
  if (order.status !== 'pending') {
    throw AppError.badRequest('订单状态不正确', ErrorCode.ORDER_STATUS_INVALID);
  }
  
  // 更新订单状态为已支付（使用真正的订单ID）
  await execute(
    'UPDATE orders SET status = "paid", payment_method = ?, payment_time = NOW() WHERE id = ?',
    [paymentMethod, order.id]
  );
  
  logger.info('订单支付成功', { orderId: order.id, orderNo: order.order_no, buyerId, paymentMethod });

  // 发送通知给卖家：订单已支付
  try {
    // 获取物品信息用于通知内容
    const item = await itemService.getItemById(order.item_id);
    await notificationService.createNotification(
      order.seller_id,
      '订单已支付',
      `买家已支付物品「${item.title}」的订单（订单编号：${order.order_no}），请尽快安排发货。`,
      'order',
      order.id
    );
  } catch (notifyError) {
    logger.error('发送支付通知失败', { error: String(notifyError) });
  }
};

/**
 * 发货/确认交易
 * 卖家确认已交付物品
 * 
 * @param orderId - 订单ID
 * @param sellerId - 卖家ID
 */
export const shipOrder = async (
  orderIdOrNo: string,
  sellerId: string
): Promise<void> => {
  assertRequiredId(orderIdOrNo, '订单ID');
  assertRequiredId(sellerId, '卖家ID');
  const order = await getOrderById(orderIdOrNo);
  
  // 检查权限
  if (order.seller_id !== sellerId) {
    throw AppError.forbidden('无权操作此订单', ErrorCode.FORBIDDEN);
  }
  
  // 检查订单状态
  if (order.status !== 'paid') {
    throw AppError.badRequest('订单状态不正确，需要先支付', ErrorCode.ORDER_STATUS_INVALID);
  }
  
  // 更新订单状态（使用真正的订单ID）
  await execute(
    'UPDATE orders SET status = "shipping", delivery_time = NOW() WHERE id = ?',
    [order.id]
  );
  
  logger.info('订单发货成功', { orderId: order.id, orderNo: order.order_no, sellerId });

  // 发送通知给买家：卖家已发货
  try {
    const item = await itemService.getItemById(order.item_id);
    await notificationService.createNotification(
      order.buyer_id,
      '卖家已发货',
      `您购买的物品「${item.title}」（订单编号：${order.order_no}）已发货，请注意查收并确认收货。`,
      'order',
      order.id
    );
  } catch (notifyError) {
    logger.error('发送发货通知失败', { error: String(notifyError) });
  }
};

/**
 * 确认收货
 * 买家确认收到物品，交易完成
 * 
 * @param orderIdOrNo - 订单ID或订单号
 * @param buyerId - 买家ID
 */
export const completeOrder = async (
  orderIdOrNo: string,
  buyerId: string
): Promise<void> => {
  assertRequiredId(orderIdOrNo, '订单ID');
  assertRequiredId(buyerId, '买家ID');
  const order = await getOrderById(orderIdOrNo);
  
  // 检查权限
  if (order.buyer_id !== buyerId) {
    throw AppError.forbidden('无权操作此订单', ErrorCode.FORBIDDEN);
  }
  
  // 检查订单状态
  if (order.status !== 'shipping') {
    throw AppError.badRequest('订单状态不正确', ErrorCode.ORDER_STATUS_INVALID);
  }
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 更新订单状态为已完成（使用真正的订单ID）
    await connection.execute(
      'UPDATE orders SET status = "completed", complete_time = NOW() WHERE id = ?',
      [order.id]
    );
    
    // 将物品状态改为已售出
    await connection.execute(
      'UPDATE items SET status = "sold" WHERE id = ?',
      [order.item_id]
    );
    
    // 给卖家增加信用分
    await connection.execute(
      'UPDATE users SET credit_score = credit_score + 5 WHERE id = ?',
      [order.seller_id]
    );
    
    await connection.commit();
    
    logger.info('订单确认收货', { orderId: order.id, orderNo: order.order_no, buyerId, sellerId: order.seller_id, itemId: order.item_id });

    // 发送通知给卖家：交易完成
    try {
      const item = await itemService.getItemById(order.item_id);
      await notificationService.createNotification(
        order.seller_id,
        '交易已完成',
        `买家已确认收货，物品「${item.title}」（订单编号：${order.order_no}）交易成功完成。感谢您的交易！`,
        'order',
        order.id
      );
    } catch (notifyError) {
      logger.error('发送交易完成通知失败', { error: String(notifyError) });
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 取消订单
 * 
 * @param orderIdOrNo - 订单ID或订单号
 * @param userId - 操作用户ID
 */
export const cancelOrder = async (
  orderIdOrNo: string,
  userId: string
): Promise<void> => {
  assertRequiredId(orderIdOrNo, '订单ID');
  assertRequiredId(userId, '用户ID');
  const order = await getOrderById(orderIdOrNo);
  
  // 检查权限：买家或卖家都可以取消
  if (order.buyer_id !== userId && order.seller_id !== userId) {
    throw AppError.forbidden('无权操作此订单', ErrorCode.FORBIDDEN);
  }
  
  // 检查订单状态：只有待支付和已支付状态可以取消
  if (order.status !== 'pending' && order.status !== 'paid') {
    throw AppError.badRequest('当前状态不允许取消订单', ErrorCode.ORDER_STATUS_INVALID);
  }
  
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 更新订单状态（使用真正的订单ID）
    await connection.execute(
      'UPDATE orders SET status = "cancelled" WHERE id = ?',
      [order.id]
    );
    
    // 恢复物品状态为已发布
    await connection.execute(
      'UPDATE items SET status = "published" WHERE id = ?',
      [order.item_id]
    );
    
    // 如果是卖家取消已支付订单，扣减信用分
    if (order.status === 'paid' && order.seller_id === userId) {
      await connection.execute(
        'UPDATE users SET credit_score = GREATEST(0, credit_score - 10) WHERE id = ?',
        [order.seller_id]
      );
    }
    
    await connection.commit();
    
    logger.info('订单已取消', { orderId: order.id, orderNo: order.order_no, cancelledBy: userId, previousStatus: order.status });

    // 发送通知给对方：订单已取消
    try {
      const item = await itemService.getItemById(order.item_id);
      // 确定通知接收者（通知对方）
      const recipientId = userId === order.buyer_id ? order.seller_id : order.buyer_id;
      const cancellerRole = userId === order.buyer_id ? '买家' : '卖家';
      
      await notificationService.createNotification(
        recipientId,
        '订单已取消',
        `${cancellerRole}已取消物品「${item.title}」的订单（订单编号：${order.order_no}）。`,
        'order',
        order.id
      );
    } catch (notifyError) {
      logger.error('发送订单取消通知失败', { error: String(notifyError) });
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 获取用户的订单列表
 * 
 * @param userId - 用户ID
 * @param role - 角色：buyer买家 或 seller卖家
 * @param status - 订单状态筛选
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserOrders = async (
  userId: string,
  role: 'buyer' | 'seller',
  status?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ orders: Order[]; total: number }> => {
  const conditions: string[] = [];
  const values: any[] = [];
  
  // 根据角色筛选
  if (role === 'buyer') {
    conditions.push('o.buyer_id = ?');
  } else {
    conditions.push('o.seller_id = ?');
  }
  values.push(userId);
  
  // 状态筛选
  if (status) {
    conditions.push('o.status = ?');
    values.push(status);
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
    values
  );
  const total = countResult[0].total;
  
  // 查询订单列表（包含物品信息）
  const orders = await query<Order>(
    `SELECT o.*, i.title as item_title, i.images as item_images, i.price as item_price
     FROM orders o
     LEFT JOIN items i ON o.item_id = i.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  
  return { orders, total };
};

/**
 * 创建评价
 * 
 * @param reviewerId - 评价者ID
 * @param params - 评价参数
 */
export const createReview = async (
  reviewerId: string,
  params: CreateReviewParams
): Promise<number> => {
  assertRequiredId(reviewerId, '评价者ID');
  const { order_id, rating, content, images, is_anonymous } = params;
  
  // 获取订单信息
  const order = await getOrderById(order_id);
  
  // 检查订单状态
  if (order.status !== 'completed') {
    throw AppError.badRequest('只有已完成的订单可以评价', ErrorCode.ORDER_STATUS_INVALID);
  }
  
  // 确定被评价者
  let reviewedId: string;
  if (order.buyer_id === reviewerId) {
    // 买家评价卖家
    reviewedId = order.seller_id;
  } else if (order.seller_id === reviewerId) {
    // 卖家评价买家
    reviewedId = order.buyer_id;
  } else {
    throw AppError.forbidden('无权评价此订单', ErrorCode.FORBIDDEN);
  }
  
  // 检查是否已评价（使用真正的订单ID）
  const existingReviews = await query<Review>(
    'SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?',
    [order.id, reviewerId]
  );
  
  if (existingReviews.length > 0) {
    throw AppError.badRequest('您已评价过此订单', ErrorCode.ORDER_ALREADY_REVIEWED);
  }
  
  // 创建评价
  const imagesJson = images ? JSON.stringify(images) : null;
  
  // 使用真正的订单ID
  const result = await execute(
    `INSERT INTO reviews (order_id, reviewer_id, reviewed_id, rating, content, images, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [order.id, reviewerId, reviewedId, rating, content || null, imagesJson, is_anonymous ? 1 : 0]
  );
  
  // 根据评分调整被评价者的信用分
  const creditDelta = rating >= 4 ? 2 : (rating <= 2 ? -3 : 0);
  if (creditDelta !== 0) {
    await userService.updateCreditScore(reviewedId, creditDelta);
  }
  
  logger.info('订单评价创建成功', { orderId: order.id, orderNo: order.order_no, reviewerId, reviewedId, rating, creditDelta });

  // 发送通知给被评价者：收到新评价
  try {
    const item = await itemService.getItemById(order.item_id);
    const reviewerRole = order.buyer_id === reviewerId ? '买家' : '卖家';
    const ratingText = rating >= 4 ? '好评' : (rating <= 2 ? '差评' : '中评');
    
    await notificationService.createNotification(
      reviewedId,
      '您收到一条新评价',
      `${is_anonymous ? '匿名用户' : reviewerRole}对您在订单「${item.title}」中的交易给出了${ratingText}（${rating}分）。`,
      'review',
      order.id
    );
  } catch (notifyError) {
    logger.error('发送评价通知失败', { error: String(notifyError) });
  }
  
  return result.insertId;
};

/**
 * 获取用户收到的评价
 * 
 * @param userId - 用户ID
 * @param page - 页码
 * @param pageSize - 每页数量
 */
export const getUserReviews = async (
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ reviews: Review[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  
  // 查询总数
  const countResult = await query<{ total: number } & RowDataPacket>(
    'SELECT COUNT(*) as total FROM reviews WHERE reviewed_id = ?',
    [userId]
  );
  const total = countResult[0].total;
  
  // 查询评价列表
  const reviews = await query<Review>(
    `SELECT r.*, 
            CASE WHEN r.is_anonymous = 1 THEN '匿名用户' ELSE u.username END as reviewer_username,
            CASE WHEN r.is_anonymous = 1 THEN NULL ELSE u.avatar END as reviewer_avatar
     FROM reviews r
     LEFT JOIN users u ON r.reviewer_id = u.id
     WHERE r.reviewed_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  
  return { reviews, total };
};

/**
 * 获取订单的评价
 * 
 * @param orderId - 订单ID
 */
export const getOrderReviews = async (orderId: string): Promise<Review[]> => {
  const reviews = await query<Review>(
    `SELECT r.*, 
            CASE WHEN r.is_anonymous = 1 THEN '匿名用户' ELSE u.username END as reviewer_username
     FROM reviews r
     LEFT JOIN users u ON r.reviewer_id = u.id
     WHERE r.order_id = ?`,
    [orderId]
  );
  
  return reviews;
};

// 导出所有服务方法
export default {
  createOrder,
  getOrderById,
  getOrderDetail,
  payOrder,
  shipOrder,
  completeOrder,
  cancelOrder,
  getUserOrders,
  createReview,
  getUserReviews,
  getOrderReviews,
};
