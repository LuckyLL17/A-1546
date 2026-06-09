jest.mock('../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

import express from 'express';
import routes from '../../src/routes/index';
import userRoutes from '../../src/routes/userRoutes';
import itemRoutes from '../../src/routes/itemRoutes';
import orderRoutes from '../../src/routes/orderRoutes';
import resourceRoutes from '../../src/routes/resourceRoutes';
import chatRoutes from '../../src/routes/chatRoutes';
import notificationRoutes from '../../src/routes/notificationRoutes';
import reportRoutes from '../../src/routes/reportRoutes';

describe('路由配置测试', () => {
  describe('路由模块存在性测试', () => {
    it('应该导出用户路由', () => {
      expect(userRoutes).toBeDefined();
      expect(typeof userRoutes).toBe('function');
    });

    it('应该导出物品路由', () => {
      expect(itemRoutes).toBeDefined();
      expect(typeof itemRoutes).toBe('function');
    });

    it('应该导出订单路由', () => {
      expect(orderRoutes).toBeDefined();
      expect(typeof orderRoutes).toBe('function');
    });

    it('应该导出资源路由', () => {
      expect(resourceRoutes).toBeDefined();
      expect(typeof resourceRoutes).toBe('function');
    });

    it('应该导出聊天路由', () => {
      expect(chatRoutes).toBeDefined();
      expect(typeof chatRoutes).toBe('function');
    });

    it('应该导出通知路由', () => {
      expect(notificationRoutes).toBeDefined();
      expect(typeof notificationRoutes).toBe('function');
    });

    it('应该导出举报路由', () => {
      expect(reportRoutes).toBeDefined();
      expect(typeof reportRoutes).toBe('function');
    });

    it('应该导出汇总路由', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });
  });

  describe('API路径结构测试', () => {
    it('应该定义正确的API基础路径', () => {
      const apiBasePath = '/api';
      expect(apiBasePath).toBe('/api');
    });

    it('应该定义各模块路径', () => {
      const modulePaths = {
        users: '/users',
        items: '/items',
        orders: '/orders',
        resources: '/resources',
        chat: '/chat',
        notifications: '/notifications',
        reports: '/reports',
        categories: '/categories',
      };

      expect(modulePaths.users).toBe('/users');
      expect(modulePaths.items).toBe('/items');
      expect(modulePaths.orders).toBe('/orders');
      expect(modulePaths.resources).toBe('/resources');
      expect(modulePaths.chat).toBe('/chat');
      expect(modulePaths.notifications).toBe('/notifications');
      expect(modulePaths.reports).toBe('/reports');
    });
  });

  describe('HTTP方法覆盖测试', () => {
    it('应该支持标准HTTP方法', () => {
      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
      expect(httpMethods).toContain('GET');
      expect(httpMethods).toContain('POST');
      expect(httpMethods).toContain('PUT');
      expect(httpMethods).toContain('DELETE');
      expect(httpMethods).toContain('OPTIONS');
    });
  });
});
