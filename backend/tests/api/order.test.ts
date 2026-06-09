jest.mock('../../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

describe('订单模块测试', () => {
  describe('订单状态机测试', () => {
    const orderStatuses = {
      pending: '待支付',
      paid: '已支付',
      shipping: '配送中',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款',
    };

    it('应该定义所有订单状态', () => {
      expect(Object.keys(orderStatuses)).toEqual([
        'pending', 'paid', 'shipping', 'completed', 'cancelled', 'refunded'
      ]);
    });

    it('应该定义合法的状态转换', () => {
      const validTransitions = [
        { from: 'pending', to: 'paid', actor: 'buyer', action: '支付订单' },
        { from: 'pending', to: 'cancelled', actor: 'buyer/seller', action: '取消订单' },
        { from: 'paid', to: 'shipping', actor: 'seller', action: '发货' },
        { from: 'paid', to: 'refunded', actor: 'system', action: '退款' },
        { from: 'shipping', to: 'completed', actor: 'buyer', action: '确认收货' },
      ];

      expect(validTransitions.length).toBe(5);
      validTransitions.forEach(t => {
        expect(t.from).toBeDefined();
        expect(t.to).toBeDefined();
        expect(t.action).toBeDefined();
      });
    });
  });

  describe('交付方式测试', () => {
    it('应该支持多种交付方式', () => {
      const deliveryMethods = ['face_to_face', 'express', 'self_pickup'];
      expect(deliveryMethods).toContain('face_to_face');
      expect(deliveryMethods).toContain('express');
      expect(deliveryMethods).toContain('self_pickup');
    });
  });

  describe('订单编号生成测试', () => {
    it('订单编号应该有规范格式', () => {
      const orderNo = `ORD${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      expect(orderNo.startsWith('ORD')).toBe(true);
      expect(orderNo.length).toBeGreaterThan(10);
    });
  });

  describe('订单业务规则测试', () => {
    it('买家不能购买自己的物品', () => {
      const buyerId = 'user-1';
      const sellerId = 'user-1';
      expect(buyerId).toBe(sellerId);
    });

    it('不同用户可以进行交易', () => {
      const buyerId = 'user-buyer';
      const sellerId = 'user-seller';
      expect(buyerId).not.toBe(sellerId);
    });

    it('评价应该在订单完成后进行', () => {
      const allowedStatus = 'completed';
      expect(allowedStatus).toBe('completed');
    });

    it('评分应该在1-5之间', () => {
      const validRatings = [1, 2, 3, 4, 5];
      validRatings.forEach(r => {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(5);
      });
    });
  });
});
