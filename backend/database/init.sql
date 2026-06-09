-- =====================================================
-- 校园二手物品交易与资源共享平台 - 数据库初始化脚本
-- =====================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS campus_trade 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE campus_trade;

-- =====================================================
-- 用户表：存储平台用户的基本信息
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识（UUID）',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名，用于登录',
  password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱地址',
  phone VARCHAR(20) COMMENT '手机号码',
  real_name VARCHAR(50) COMMENT '真实姓名',
  student_id VARCHAR(20) COMMENT '学号',
  avatar VARCHAR(255) COMMENT '头像URL',
  school VARCHAR(100) COMMENT '学校名称',
  campus VARCHAR(100) COMMENT '校区',
  dormitory VARCHAR(100) COMMENT '宿舍地址',
  credit_score INT DEFAULT 100 COMMENT '信用积分，初始100分',
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '账户状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_school (school)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';

-- =====================================================
-- 物品分类表：存储物品的分类信息
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  parent_id INT DEFAULT NULL COMMENT '父分类ID，NULL表示顶级分类',
  icon VARCHAR(255) COMMENT '分类图标',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '分类状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物品分类表';

-- =====================================================
-- 物品表：存储二手物品的详细信息
-- =====================================================
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(36) PRIMARY KEY COMMENT '物品唯一标识（UUID）',
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家用户ID',
  category_id INT COMMENT '分类ID',
  title VARCHAR(100) NOT NULL COMMENT '物品标题',
  description TEXT COMMENT '物品描述',
  original_price DECIMAL(10, 2) COMMENT '原价',
  price DECIMAL(10, 2) NOT NULL COMMENT '售价',
  condition_level ENUM('new', 'like_new', 'good', 'fair', 'poor') DEFAULT 'good' COMMENT '新旧程度：全新、几乎全新、良好、一般、较差',
  images JSON COMMENT '图片URL列表（JSON数组）',
  location VARCHAR(255) COMMENT '物品所在位置',
  view_count INT DEFAULT 0 COMMENT '浏览次数',
  like_count INT DEFAULT 0 COMMENT '收藏次数',
  status ENUM('draft', 'published', 'sold', 'reserved', 'removed') DEFAULT 'draft' COMMENT '物品状态：草稿、已发布、已售出、已预订、已下架',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_seller_id (seller_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二手物品表';

-- =====================================================
-- 物品收藏表：记录用户收藏的物品
-- =====================================================
CREATE TABLE IF NOT EXISTS item_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '收藏记录ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  item_id VARCHAR(36) NOT NULL COMMENT '物品ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_item (user_id, item_id),
  INDEX idx_user_id (user_id),
  INDEX idx_item_id (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物品收藏表';

-- =====================================================
-- 订单表：存储交易订单信息
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '订单唯一标识（UUID）',
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  item_id VARCHAR(36) NOT NULL COMMENT '物品ID',
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',
  buyer_id VARCHAR(36) NOT NULL COMMENT '买家ID',
  price DECIMAL(10, 2) NOT NULL COMMENT '成交价格',
  status ENUM('pending', 'paid', 'shipping', 'completed', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '订单状态：待支付、已支付、配送中、已完成、已取消、已退款',
  payment_method VARCHAR(50) COMMENT '支付方式',
  payment_time TIMESTAMP NULL COMMENT '支付时间',
  delivery_method ENUM('face_to_face', 'express', 'self_pickup') DEFAULT 'face_to_face' COMMENT '交付方式：面交、快递、自取',
  delivery_address VARCHAR(255) COMMENT '收货地址',
  delivery_time TIMESTAMP NULL COMMENT '发货时间',
  complete_time TIMESTAMP NULL COMMENT '完成时间',
  remark TEXT COMMENT '订单备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order_no (order_no),
  INDEX idx_seller_id (seller_id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- =====================================================
-- 评价表：存储交易完成后的评价信息
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '评价ID',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  reviewer_id VARCHAR(36) NOT NULL COMMENT '评价者ID',
  reviewed_id VARCHAR(36) NOT NULL COMMENT '被评价者ID',
  rating INT NOT NULL COMMENT '评分（1-5）',
  content TEXT COMMENT '评价内容',
  images JSON COMMENT '评价图片（JSON数组）',
  is_anonymous TINYINT(1) DEFAULT 0 COMMENT '是否匿名评价',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_reviewed_id (reviewed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- =====================================================
-- 聊天会话表：存储用户之间的聊天会话
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(36) PRIMARY KEY COMMENT '会话唯一标识（UUID）',
  item_id VARCHAR(36) COMMENT '关联的物品ID',
  user1_id VARCHAR(36) NOT NULL COMMENT '用户1 ID',
  user2_id VARCHAR(36) NOT NULL COMMENT '用户2 ID',
  last_message TEXT COMMENT '最后一条消息内容',
  last_message_time TIMESTAMP NULL COMMENT '最后消息时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_users_item (user1_id, user2_id, item_id),
  INDEX idx_user1_id (user1_id),
  INDEX idx_user2_id (user2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天会话表';

-- =====================================================
-- 聊天消息表：存储聊天消息内容
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
  session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
  sender_id VARCHAR(36) NOT NULL COMMENT '发送者ID',
  content TEXT NOT NULL COMMENT '消息内容',
  message_type ENUM('text', 'image', 'item') DEFAULT 'text' COMMENT '消息类型：文本、图片、物品链接',
  is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_sender_id (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- =====================================================
-- 资源共享表：存储共享资源信息（如学习资料、工具等）
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_resources (
  id VARCHAR(36) PRIMARY KEY COMMENT '资源唯一标识（UUID）',
  user_id VARCHAR(36) NOT NULL COMMENT '分享者ID',
  title VARCHAR(100) NOT NULL COMMENT '资源标题',
  description TEXT COMMENT '资源描述',
  resource_type ENUM('document', 'video', 'tool', 'other') DEFAULT 'other' COMMENT '资源类型：文档、视频、工具、其他',
  file_url VARCHAR(255) COMMENT '文件URL',
  file_size BIGINT COMMENT '文件大小（字节）',
  download_count INT DEFAULT 0 COMMENT '下载次数',
  like_count INT DEFAULT 0 COMMENT '点赞次数',
  tags JSON COMMENT '标签（JSON数组）',
  is_free TINYINT(1) DEFAULT 1 COMMENT '是否免费',
  points_required INT DEFAULT 0 COMMENT '所需积分（非免费时）',
  status ENUM('pending', 'approved', 'rejected', 'removed') DEFAULT 'pending' COMMENT '审核状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_resource_type (resource_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源共享表';

-- =====================================================
-- 资源下载记录表：记录用户的资源下载历史
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_downloads (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '下载记录ID',
  resource_id VARCHAR(36) NOT NULL COMMENT '资源ID',
  user_id VARCHAR(36) NOT NULL COMMENT '下载用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '下载时间',
  FOREIGN KEY (resource_id) REFERENCES shared_resources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_resource_id (resource_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源下载记录表';

-- =====================================================
-- 举报表：存储用户举报信息
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '举报ID',
  reporter_id VARCHAR(36) NOT NULL COMMENT '举报者ID',
  target_type ENUM('user', 'item', 'resource', 'message') NOT NULL COMMENT '举报目标类型',
  target_id VARCHAR(36) NOT NULL COMMENT '举报目标ID',
  reason VARCHAR(255) NOT NULL COMMENT '举报原因',
  description TEXT COMMENT '详细描述',
  images JSON COMMENT '证据图片（JSON数组）',
  status ENUM('pending', 'processing', 'resolved', 'rejected') DEFAULT 'pending' COMMENT '处理状态',
  result TEXT COMMENT '处理结果',
  handler_id VARCHAR(36) COMMENT '处理人ID',
  handled_at TIMESTAMP NULL COMMENT '处理时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '举报时间',
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_target (target_type, target_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='举报表';

-- =====================================================
-- 通知表：存储系统通知和消息
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
  user_id VARCHAR(36) NOT NULL COMMENT '接收用户ID',
  title VARCHAR(100) NOT NULL COMMENT '通知标题',
  content TEXT NOT NULL COMMENT '通知内容',
  notification_type ENUM('system', 'order', 'chat', 'item', 'review') DEFAULT 'system' COMMENT '通知类型',
  related_id VARCHAR(36) COMMENT '关联的业务ID',
  is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- =====================================================
-- 插入默认分类数据
-- =====================================================
INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
('电子数码', NULL, 'electronic', 1),
('书籍教材', NULL, 'book', 2),
('生活用品', NULL, 'daily', 3),
('服饰鞋帽', NULL, 'clothes', 4),
('运动户外', NULL, 'sports', 5),
('美妆个护', NULL, 'beauty', 6),
('票券卡劵', NULL, 'ticket', 7),
('其他', NULL, 'other', 8);

-- 电子数码子分类
INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
('手机', 1, 'phone', 1),
('电脑', 1, 'computer', 2),
('平板', 1, 'tablet', 3),
('相机', 1, 'camera', 4),
('耳机音箱', 1, 'audio', 5),
('其他数码', 1, 'digital', 6);

-- 书籍教材子分类
INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
('教材教辅', 2, 'textbook', 1),
('考试资料', 2, 'exam', 2),
('文学小说', 2, 'novel', 3),
('专业书籍', 2, 'professional', 4),
('杂志期刊', 2, 'magazine', 5);

-- 生活用品子分类
INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
('家居用品', 3, 'home', 1),
('厨房用品', 3, 'kitchen', 2),
('收纳整理', 3, 'storage', 3),
('床上用品', 3, 'bedding', 4);

COMMIT;
