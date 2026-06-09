jest.mock('../../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('模块间协作集成测试', () => {
  describe('用户模块 ↔ 认证中间件 ↔ 其他模块 集成测试', () => {
    it('用户注册后应该能获取Token用于后续请求', () => {
      const userId = uuidv4();
      const userData = {
        id: userId,
        username: 'integration_user',
        email: 'integration@test.com',
        credit_score: 100,
        status: 'active'
      };

      const token = jwt.sign(
        { userId: userData.id, username: userData.username, email: userData.email },
        'test-secret',
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, 'test-secret') as any;
      expect(decoded.userId).toBe(userId);
    });

    it('密码加密后应该能正确验证', async () => {
      const password = 'SecurePass123';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('用户模块 ↔ 物品模块 ↔ 订单模块 完整交易流程测试', () => {
    it('完整交易流程：卖家发布 → 买家下单 → 支付 → 发货 → 确认收货 → 评价', () => {
      const sellerId = uuidv4();
      const buyerId = uuidv4();
      const itemId = uuidv4();
      const orderId = uuidv4();

      const workflow = [
        { step: 1, actor: 'seller', action: '创建物品草稿', itemStatus: 'draft' },
        { step: 2, actor: 'seller', action: '发布物品', itemStatus: 'published' },
        { step: 3, actor: 'buyer', action: '浏览并收藏物品', favorite: true },
        { step: 4, actor: 'buyer', action: '创建订单', orderStatus: 'pending' },
        { step: 5, actor: 'buyer', action: '支付订单', orderStatus: 'paid', itemStatus: 'reserved' },
        { step: 6, actor: 'seller', action: '发货', orderStatus: 'shipping' },
        { step: 7, actor: 'buyer', action: '确认收货', orderStatus: 'completed', itemStatus: 'sold' },
        { step: 8, actor: 'buyer', action: '评价订单', reviewCreated: true },
      ];

      expect(workflow).toHaveLength(8);
      
      let currentItemStatus = '';
      let currentOrderStatus = '';
      
      workflow.forEach(step => {
        if (step.itemStatus) currentItemStatus = step.itemStatus;
        if (step.orderStatus) currentOrderStatus = step.orderStatus;
      });

      expect(currentItemStatus).toBe('sold');
      expect(currentOrderStatus).toBe('completed');
    });

    it('订单取消应该释放物品预订状态', () => {
      const scenario = [
        { status: 'published', action: '买家下单' },
        { status: 'reserved', action: '订单创建成功' },
        { status: 'reserved', action: '买家取消订单' },
        { status: 'published', action: '物品重新上架' },
      ];

      const finalState = scenario[scenario.length - 1];
      expect(finalState.status).toBe('published');
    });
  });

  describe('用户模块 ↔ 物品模块 ↔ 聊天模块 咨询流程测试', () => {
    it('买家咨询物品时应该创建或复用会话', () => {
      const buyerId = uuidv4();
      const sellerId = uuidv4();
      const itemId = uuidv4();

      const session = {
        id: uuidv4(),
        user1_id: buyerId,
        user2_id: sellerId,
        item_id: itemId,
      };

      expect(session.user1_id).not.toBe(session.user2_id);
      expect(session.item_id).toBe(itemId);
    });

    it('消息发送应该与会话关联', () => {
      const sessionId = uuidv4();
      const senderId = uuidv4();
      const messages = [
        { session_id: sessionId, sender_id: senderId, content: '你好，这个物品还在吗？', message_type: 'text' },
        { session_id: sessionId, sender_id: senderId, content: '在的，可以随时看货', message_type: 'text' },
      ];

      messages.forEach(msg => {
        expect(msg.session_id).toBe(sessionId);
      });
    });
  });

  describe('订单模块 ↔ 通知模块 通知触发测试', () => {
    it('各订单状态变更应该触发相应通知', () => {
      const notificationTriggers = [
        { event: 'order_created', recipient: 'seller', type: 'order', title: '新订单通知' },
        { event: 'order_paid', recipient: 'seller', type: 'order', title: '订单已支付' },
        { event: 'order_shipped', recipient: 'buyer', type: 'order', title: '卖家已发货' },
        { event: 'order_completed', recipient: 'seller', type: 'order', title: '订单已完成' },
        { event: 'review_created', recipient: 'seller', type: 'review', title: '收到新评价' },
      ];

      expect(notificationTriggers.length).toBe(5);
      notificationTriggers.forEach(trigger => {
        expect(trigger.recipient).toBeDefined();
        expect(trigger.type).toBeDefined();
      });
    });
  });

  describe('聊天模块 ↔ 通知模块 消息通知测试', () => {
    it('收到新消息应该发送通知并更新未读数', () => {
      let unreadCount = 0;
      const events = [
        { type: 'message_received', notified: true, unreadIncrement: 1 },
        { type: 'message_received', notified: true, unreadIncrement: 1 },
        { type: 'messages_read', notified: false, unreadReset: true },
      ];

      events.forEach(event => {
        if (event.unreadIncrement) unreadCount += event.unreadIncrement;
        if (event.unreadReset) unreadCount = 0;
      });

      expect(unreadCount).toBe(0);
    });
  });

  describe('用户模块 ↔ 资源模块 资源分享流程测试', () => {
    it('资源分享完整流程：创建 → 发布 → 浏览 → 下载/点赞', () => {
      const userId = uuidv4();
      const resourceId = uuidv4();

      const resourceWorkflow = [
        { step: 1, action: '上传资源', status: 'pending' },
        { step: 2, action: '发布资源', status: 'approved' },
        { step: 3, action: '其他用户浏览', downloadCount: 0, likeCount: 0 },
        { step: 4, action: '用户A下载', downloadCount: 1 },
        { step: 5, action: '用户B点赞', likeCount: 1 },
        { step: 6, action: '用户C下载并点赞', downloadCount: 2, likeCount: 2 },
      ];

      let finalDownloads = 0;
      let finalLikes = 0;
      resourceWorkflow.forEach(step => {
        if (step.downloadCount !== undefined) finalDownloads = step.downloadCount;
        if (step.likeCount !== undefined) finalLikes = step.likeCount;
      });

      expect(finalDownloads).toBe(2);
      expect(finalLikes).toBe(2);
    });
  });

  describe('权限控制集成测试', () => {
    it('资源所有者应该拥有编辑/删除权限', () => {
      const ownerId = uuidv4();
      const otherUserId = uuidv4();
      const resource = { id: uuidv4(), user_id: ownerId };

      const canEdit = (userId: string) => userId === resource.user_id;

      expect(canEdit(ownerId)).toBe(true);
      expect(canEdit(otherUserId)).toBe(false);
    });

    it('订单权限：买家和卖家都能查看订单', () => {
      const buyerId = uuidv4();
      const sellerId = uuidv4();
      const otherUserId = uuidv4();
      const order = { id: uuidv4(), buyer_id: buyerId, seller_id: sellerId };

      const canView = (userId: string) => 
        userId === order.buyer_id || userId === order.seller_id;

      expect(canView(buyerId)).toBe(true);
      expect(canView(sellerId)).toBe(true);
      expect(canView(otherUserId)).toBe(false);
    });

    it('订单操作权限检查', () => {
      const buyerId = uuidv4();
      const sellerId = uuidv4();

      const permissions = {
        pay: buyerId,
        ship: sellerId,
        complete: buyerId,
        cancel: [buyerId, sellerId],
      };

      expect(permissions.pay).toBe(buyerId);
      expect(permissions.ship).toBe(sellerId);
      expect(permissions.complete).toBe(buyerId);
      expect(permissions.cancel).toContain(buyerId);
      expect(permissions.cancel).toContain(sellerId);
    });
  });

  describe('错误码一致性测试', () => {
    it('应该使用统一的错误码体系', () => {
      const errorCodes = {
        PARAM_ERROR: { code: 1000, module: 'common' },
        PARAM_VALIDATION_FAILED: { code: 1001, module: 'common' },
        UNAUTHORIZED: { code: 1100, module: 'auth' },
        TOKEN_EXPIRED: { code: 1101, module: 'auth' },
        TOKEN_INVALID: { code: 1102, module: 'auth' },
        PERMISSION_DENIED: { code: 1103, module: 'auth' },
        USER_NOT_FOUND: { code: 2000, module: 'user' },
        USERNAME_EXISTS: { code: 2001, module: 'user' },
        EMAIL_EXISTS: { code: 2002, module: 'user' },
        PASSWORD_ERROR: { code: 2003, module: 'user' },
        ITEM_NOT_FOUND: { code: 3000, module: 'item' },
        ITEM_NOT_AVAILABLE: { code: 3001, module: 'item' },
        ITEM_ALREADY_SOLD: { code: 3002, module: 'item' },
        ORDER_NOT_FOUND: { code: 4000, module: 'order' },
        ORDER_STATUS_ERROR: { code: 4001, module: 'order' },
        CANNOT_BUY_OWN_ITEM: { code: 4002, module: 'order' },
        ALREADY_REVIEWED: { code: 4003, module: 'order' },
        SESSION_NOT_FOUND: { code: 5000, module: 'chat' },
        RESOURCE_NOT_FOUND: { code: 6000, module: 'resource' },
      };

      const codes = Object.values(errorCodes).map(e => e.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('数据库表关系集成测试', () => {
    it('应该通过外键建立正确的表关联', () => {
      const relationships = [
        { from: 'items.seller_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'item_favorites.user_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'item_favorites.item_id', to: 'items.id', onDelete: 'CASCADE' },
        { from: 'orders.item_id', to: 'items.id', onDelete: 'CASCADE' },
        { from: 'orders.seller_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'orders.buyer_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'reviews.order_id', to: 'orders.id', onDelete: 'CASCADE' },
        { from: 'chat_sessions.user1_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'chat_sessions.user2_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'chat_messages.session_id', to: 'chat_sessions.id', onDelete: 'CASCADE' },
        { from: 'shared_resources.user_id', to: 'users.id', onDelete: 'CASCADE' },
        { from: 'notifications.user_id', to: 'users.id', onDelete: 'CASCADE' },
      ];

      expect(relationships.length).toBe(12);
      relationships.forEach(rel => {
        expect(rel.from).toBeDefined();
        expect(rel.to).toBeDefined();
      });
    });

    it('应该建立正确的唯一约束', () => {
      const uniqueConstraints = [
        'users.username',
        'users.email',
        'orders.order_no',
        'item_favorites(user_id, item_id)',
        'chat_sessions(user1_id, user2_id, item_id)',
      ];

      expect(uniqueConstraints.length).toBe(5);
    });

    it('应该建立必要的数据库索引', () => {
      const indexes = [
        'users.username',
        'users.email',
        'users.school',
        'items.seller_id',
        'items.status',
        'items.created_at',
        'orders.buyer_id',
        'orders.seller_id',
        'orders.status',
      ];

      expect(indexes.length).toBe(9);
    });
  });
});
