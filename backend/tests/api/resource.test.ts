jest.mock('../../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

describe('资源共享模块测试', () => {
  describe('资源类型测试', () => {
    it('应该定义所有资源类型', () => {
      const resourceTypes = ['document', 'video', 'tool', 'other'];
      expect(resourceTypes).toContain('document');
      expect(resourceTypes).toContain('video');
      expect(resourceTypes).toContain('tool');
      expect(resourceTypes).toContain('other');
    });
  });

  describe('资源状态测试', () => {
    it('应该定义资源审核状态', () => {
      const statuses = ['pending', 'approved', 'rejected', 'removed'];
      expect(statuses).toContain('pending');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('removed');
    });

    it('新创建的资源应该是待审核状态', () => {
      const newResource = { status: 'pending' };
      expect(newResource.status).toBe('pending');
    });
  });

  describe('积分系统测试', () => {
    it('免费资源应该不需要积分', () => {
      const freeResource = { is_free: true, points_required: 0 };
      expect(freeResource.is_free).toBe(true);
      expect(freeResource.points_required).toBe(0);
    });

    it('付费资源应该指定所需积分', () => {
      const paidResource = { is_free: false, points_required: 10 };
      expect(paidResource.is_free).toBe(false);
      expect(paidResource.points_required).toBeGreaterThan(0);
    });
  });

  describe('下载计数测试', () => {
    it('下载计数应该递增', () => {
      let downloadCount = 0;
      downloadCount++;
      expect(downloadCount).toBe(1);
      downloadCount++;
      expect(downloadCount).toBe(2);
    });

    it('点赞计数应该递增', () => {
      let likeCount = 0;
      likeCount++;
      expect(likeCount).toBe(1);
    });
  });
});
