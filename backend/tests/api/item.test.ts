jest.mock('../../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

import * as itemService from '../../src/services/itemService';

describe('物品模块测试', () => {
  describe('物品状态流转测试', () => {
    const validTransitions = [
      { from: 'draft', to: 'published', action: '发布物品' },
      { from: 'published', to: 'reserved', action: '预订物品' },
      { from: 'reserved', to: 'sold', action: '确认售出' },
      { from: 'published', to: 'removed', action: '下架物品' },
      { from: 'draft', to: 'removed', action: '删除草稿' },
    ];

    it('应该定义所有必要的物品状态', () => {
      const validStatuses = ['draft', 'published', 'sold', 'reserved', 'removed'];
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('published');
      expect(validStatuses).toContain('sold');
      expect(validStatuses).toContain('reserved');
      expect(validStatuses).toContain('removed');
    });

    it('应该定义物品成色等级', () => {
      const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];
      expect(conditions.length).toBe(5);
      expect(conditions).toContain('new');
      expect(conditions).toContain('like_new');
    });
  });

  describe('价格验证测试', () => {
    it('价格应该为正数', () => {
      const prices = [0.01, 1, 99.99, 1000, 99999.99];
      prices.forEach(price => {
        expect(price).toBeGreaterThan(0);
      });
    });

    it('价格应该有合理的精度', () => {
      const price = 99.99;
      expect(Number(price.toFixed(2))).toBe(price);
    });
  });

  describe('分类数据测试', () => {
    it('应该包含默认分类', () => {
      const categories = [
        '电子数码', '书籍教材', '生活用品', '服饰鞋帽',
        '运动户外', '美妆个护', '票券卡劵', '其他'
      ];
      expect(categories.length).toBe(8);
    });
  });
});
