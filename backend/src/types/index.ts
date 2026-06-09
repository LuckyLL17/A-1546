/**
 * 类型定义模块
 * 集中定义所有业务实体的TypeScript接口
 * 这些接口确保代码的类型安全，并作为数据结构的文档
 */

import { RowDataPacket } from 'mysql2';

// =====================================================
// 用户相关类型
// =====================================================

/**
 * 用户状态枚举
 */
export type UserStatus = 'active' | 'inactive' | 'banned';

/**
 * 用户实体接口
 * 对应数据库users表的结构
 */
export interface User extends RowDataPacket {
  id: string;              // 用户唯一标识（UUID）
  username: string;        // 用户名
  password: string;        // 加密后的密码
  email: string;           // 邮箱
  phone?: string;          // 手机号（可选）
  real_name?: string;      // 真实姓名（可选）
  student_id?: string;     // 学号（可选）
  avatar?: string;         // 头像URL（可选）
  school?: string;         // 学校（可选）
  campus?: string;         // 校区（可选）
  dormitory?: string;      // 宿舍（可选）
  credit_score: number;    // 信用积分
  status: UserStatus;      // 账户状态
  created_at: Date;        // 创建时间
  updated_at: Date;        // 更新时间
}

/**
 * 用户注册请求参数
 */
export interface RegisterParams {
  username: string;
  password: string;
  email: string;
  phone?: string;
}

/**
 * 用户登录请求参数
 */
export interface LoginParams {
  username: string;   // 用户名或邮箱
  password: string;
}

/**
 * 用户信息更新参数
 */
export interface UpdateUserParams {
  real_name?: string;
  phone?: string;
  avatar?: string;
  school?: string;
  campus?: string;
  dormitory?: string;
  student_id?: string;
}

/**
 * 用户公开信息（不包含敏感字段）
 */
export interface UserPublicInfo {
  id: string;
  username: string;
  avatar?: string;
  school?: string;
  credit_score: number;
  created_at: Date;
}

// =====================================================
// 物品相关类型
// =====================================================

/**
 * 物品新旧程度枚举
 */
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

/**
 * 物品状态枚举
 */
export type ItemStatus = 'draft' | 'published' | 'sold' | 'reserved' | 'removed';

/**
 * 物品实体接口
 */
export interface Item extends RowDataPacket {
  id: string;                   // 物品唯一标识
  seller_id: string;            // 卖家ID
  category_id?: number;         // 分类ID
  title: string;                // 标题
  description?: string;         // 描述
  original_price?: number;      // 原价
  price: number;                // 售价
  condition_level: ItemCondition;  // 新旧程度
  images?: string;              // 图片JSON字符串
  location?: string;            // 物品位置
  view_count: number;           // 浏览次数
  like_count: number;           // 收藏次数
  status: ItemStatus;           // 物品状态
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 创建物品参数
 */
export interface CreateItemParams {
  category_id?: number;
  title: string;
  description?: string;
  original_price?: number;
  price: number;
  condition_level?: ItemCondition;
  images?: string[];
  location?: string;
}

/**
 * 更新物品参数
 */
export interface UpdateItemParams {
  category_id?: number;
  title?: string;
  description?: string;
  original_price?: number;
  price?: number;
  condition_level?: ItemCondition;
  images?: string[];
  location?: string;
  status?: ItemStatus;
}

/**
 * 物品搜索参数
 */
export interface SearchItemParams {
  keyword?: string;           // 关键词
  category_id?: number;       // 分类ID
  min_price?: number;         // 最低价格
  max_price?: number;         // 最高价格
  condition_level?: ItemCondition;  // 新旧程度
  school?: string;            // 学校
  sort_by?: 'price_asc' | 'price_desc' | 'time_desc' | 'time_asc';  // 排序方式
  page?: number;              // 页码
  page_size?: number;         // 每页数量
}

// =====================================================
// 分类相关类型
// =====================================================

/**
 * 分类实体接口
 */
export interface Category extends RowDataPacket {
  id: number;
  name: string;
  parent_id?: number;
  icon?: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: Date;
}

// =====================================================
// 订单相关类型
// =====================================================

/**
 * 订单状态枚举
 */
export type OrderStatus = 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled' | 'refunded';

/**
 * 交付方式枚举
 */
export type DeliveryMethod = 'face_to_face' | 'express' | 'self_pickup';

/**
 * 订单实体接口
 */
export interface Order extends RowDataPacket {
  id: string;                    // 订单唯一标识
  order_no: string;              // 订单编号
  item_id: string;               // 物品ID
  seller_id: string;             // 卖家ID
  buyer_id: string;              // 买家ID
  price: number;                 // 成交价格
  status: OrderStatus;           // 订单状态
  payment_method?: string;       // 支付方式
  payment_time?: Date;           // 支付时间
  delivery_method: DeliveryMethod;  // 交付方式
  delivery_address?: string;     // 收货地址
  delivery_time?: Date;          // 发货时间
  complete_time?: Date;          // 完成时间
  remark?: string;               // 备注
  created_at: Date;              // 创建时间
  updated_at: Date;              // 更新时间
}

/**
 * 创建订单参数
 */
export interface CreateOrderParams {
  item_id: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  remark?: string;
}

/**
 * 更新订单参数
 */
export interface UpdateOrderParams {
  status?: OrderStatus;
  payment_method?: string;
  delivery_address?: string;
  remark?: string;
}

// =====================================================
// 评价相关类型
// =====================================================

/**
 * 评价实体接口
 */
export interface Review extends RowDataPacket {
  id: number;
  order_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  content?: string;
  images?: string;
  is_anonymous: boolean;
  created_at: Date;
}

/**
 * 创建评价参数
 */
export interface CreateReviewParams {
  order_id: string;
  rating: number;
  content?: string;
  images?: string[];
  is_anonymous?: boolean;
}

// =====================================================
// 聊天相关类型
// =====================================================

/**
 * 聊天消息类型枚举
 */
export type MessageType = 'text' | 'image' | 'item';

/**
 * 聊天会话实体接口
 */
export interface ChatSession extends RowDataPacket {
  id: string;
  item_id?: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  last_message_time?: Date;
  created_at: Date;
}

/**
 * 聊天消息实体接口
 */
export interface ChatMessage extends RowDataPacket {
  id: number;
  session_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  is_read: boolean;
  created_at: Date;
}

/**
 * 发送消息参数
 */
export interface SendMessageParams {
  session_id?: string;       // 会话ID（已有会话时传入）
  receiver_id?: string;      // 接收者ID（新建会话时传入）
  item_id?: string;          // 关联物品ID（可选）
  content: string;           // 消息内容
  message_type?: MessageType;  // 消息类型
}

// =====================================================
// 资源共享相关类型
// =====================================================

/**
 * 资源类型枚举
 */
export type ResourceType = 'document' | 'video' | 'tool' | 'other';

/**
 * 资源状态枚举
 */
export type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'removed';

/**
 * 共享资源实体接口
 */
export interface SharedResource extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file_url?: string;
  file_size?: number;
  download_count: number;
  like_count: number;
  tags?: string;
  is_free: boolean;
  points_required: number;
  status: ResourceStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * 创建资源参数
 */
export interface CreateResourceParams {
  title: string;
  description?: string;
  resource_type: ResourceType;
  file_url?: string;
  file_size?: number;
  tags?: string[];
  is_free?: boolean;
  points_required?: number;
}

/**
 * 更新资源参数
 */
export interface UpdateResourceParams {
  title?: string;
  description?: string;
  resource_type?: ResourceType;
  file_url?: string;
  tags?: string[];
  is_free?: boolean;
  points_required?: number;
}

/**
 * 搜索资源参数
 */
export interface SearchResourceParams {
  keyword?: string;
  resource_type?: ResourceType;
  is_free?: boolean;
  tags?: string[];
  sort_by?: 'time_desc' | 'download_desc' | 'like_desc';
  page?: number;
  page_size?: number;
}

// =====================================================
// 通知相关类型
// =====================================================

/**
 * 通知类型枚举
 */
export type NotificationType = 'system' | 'order' | 'chat' | 'item' | 'review';

/**
 * 通知实体接口
 */
export interface Notification extends RowDataPacket {
  id: number;
  user_id: string;
  title: string;
  content: string;
  notification_type: NotificationType;
  related_id?: string;
  is_read: boolean;
  created_at: Date;
}

// =====================================================
// 举报相关类型
// =====================================================

/**
 * 举报目标类型枚举
 */
export type ReportTargetType = 'user' | 'item' | 'resource' | 'message';

/**
 * 举报状态枚举
 */
export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

/**
 * 举报实体接口
 */
export interface Report extends RowDataPacket {
  id: number;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string;
  images?: string;
  status: ReportStatus;
  result?: string;
  handler_id?: string;
  handled_at?: Date;
  created_at: Date;
}

/**
 * 创建举报参数
 */
export interface CreateReportParams {
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string;
  images?: string[];
}

// =====================================================
// 通用类型
// =====================================================

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/**
 * JWT负载
 */
export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Express请求扩展（包含用户信息）
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
