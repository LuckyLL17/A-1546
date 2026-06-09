jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, resetMockDatabase } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';

const token = generateToken({ userId: 'user-uuid-123', username: 'testuser' });
const authHeader = { Authorization: `Bearer ${token}` };

describe('Notification API', () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe('GET /api/notifications', () => {
    it('should return paginated notification list', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 2 }] as any;
        }
        return [
          { id: 1, user_id: 'user-uuid-123', title: '系统通知', content: '欢迎使用', notification_type: 'system', is_read: false, created_at: '2026-01-01T00:00:00Z' },
          { id: 2, user_id: 'user-uuid-123', title: '订单通知', content: '订单已发货', notification_type: 'order', is_read: true, created_at: '2026-01-02T00:00:00Z' },
        ] as any;
      });

      const res = await request(app)
        .get('/api/notifications')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should support unread_only filter', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('is_read = 0')) {
          if (sql.includes('COUNT(*)')) {
            return [{ total: 1 }] as any;
          }
          return [
            { id: 1, user_id: 'user-uuid-123', title: '未读通知', content: 'test', notification_type: 'system', is_read: false },
          ] as any;
        }
        if (sql.includes('COUNT(*)')) {
          return [{ total: 2 }] as any;
        }
        return [] as any;
      });

      const res = await request(app)
        .get('/api/notifications')
        .query({ unread_only: 'true' })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/notifications');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      setMockQuery(async () => {
        return [{ count: 3 }] as any;
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.count).toBe(3);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/notifications/unread-count');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      setMockExecute(async () => ({ affectedRows: 5, insertId: 0 } as any));

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('全部标记成功');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/notifications/read-all');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    it('should mark one notification as read', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .post('/api/notifications/1/read')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('标记成功');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/notifications/1/read');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .delete('/api/notifications/1')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('删除成功');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).delete('/api/notifications/1');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
