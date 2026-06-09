import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/testHelper';

describe('通知模块 API 测试', () => {
  let user: { id: string; token: string };

  beforeAll(async () => {
    const testUser = await createTestUser('notify');
    user = { id: testUser.id, token: testUser.token };
  });

  describe('GET /api/notifications - 获取通知列表', () => {
    it('应该成功获取通知列表', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ type: 'system', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count - 获取未读通知数', () => {
    it('应该成功获取未读通知数', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(typeof response.body.data.count).toBe('number');
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/notifications/:id/read - 标记单条通知已读', () => {
    let notificationId: number;

    beforeAll(async () => {
      const listResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, page_size: 1 });
      
      if (listResponse.body.data?.list?.length > 0) {
        notificationId = listResponse.body.data.list[0].id;
      }
    });

    it('应该成功标记通知已读', async () => {
      if (!notificationId) {
        return;
      }
      
      const response = await request(app)
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权操作', async () => {
      const response = await request(app)
        .post('/api/notifications/1/read');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/notifications/read-all - 标记全部通知已读', () => {
    it('应该成功标记所有通知已读', async () => {
      const response = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权操作', async () => {
      const response = await request(app)
        .post('/api/notifications/read-all');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/notifications/:id - 删除通知', () => {
    let notificationId: number;

    beforeAll(async () => {
      const listResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, page_size: 1 });
      
      if (listResponse.body.data?.list?.length > 0) {
        notificationId = listResponse.body.data.list[0].id;
      }
    });

    it('应该成功删除通知', async () => {
      if (!notificationId) {
        return;
      }
      
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权删除', async () => {
      const response = await request(app)
        .delete('/api/notifications/1');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/notifications - 批量删除通知', () => {
    it('应该成功批量删除通知', async () => {
      const response = await request(app)
        .delete('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          ids: [1, 2, 3],
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权删除', async () => {
      const response = await request(app)
        .delete('/api/notifications')
        .send({
          ids: [1, 2, 3],
        });

      expect(response.status).toBe(401);
    });
  });
});
