import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestItem } from '../helpers/testHelper';

describe('聊天模块 API 测试', () => {
  let user1: { id: string; token: string };
  let user2: { id: string; token: string };
  let itemId: string;
  let sessionId: string;

  beforeAll(async () => {
    const testUser1 = await createTestUser('chat1');
    user1 = { id: testUser1.id, token: testUser1.token };
    
    const testUser2 = await createTestUser('chat2');
    user2 = { id: testUser2.id, token: testUser2.token };

    const testItem = await createTestItem(user1.token);
    itemId = testItem.id;
  });

  describe('POST /api/chat/sessions - 创建或获取会话', () => {
    it('应该成功创建会话', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          item_id: itemId,
          receiver_id: user1.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBeDefined();
      sessionId = response.body.data.id;
    });

    it('应该拒绝未授权创建会话', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({
          item_id: itemId,
          receiver_id: user1.id,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chat/sessions - 获取会话列表', () => {
    it('应该成功获取会话列表', async () => {
      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${user1.token}`)
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/chat/sessions');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chat/sessions/:id - 获取会话详情', () => {
    it('应该成功获取会话详情', async () => {
      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(sessionId);
    });

    it('应该拒绝非会话成员访问', async () => {
      const otherUser = await createTestUser('other');
      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/chat/sessions/:id/messages - 发送消息', () => {
    it('应该成功发送文本消息', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          content: '你好，请问这个物品还在吗？',
          message_type: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBeDefined();
    });

    it('应该拒绝未授权发送消息', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: '测试消息',
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝非会话成员发送消息', async () => {
      const otherUser = await createTestUser('other2');
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({
          content: '非法消息',
        });

      expect(response.status).toBe(403);
    });

    it('应该拒绝发送空消息', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          content: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/sessions/:id/messages - 获取消息列表', () => {
    it('应该成功获取消息列表', async () => {
      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .query({ page: 1, page_size: 20 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该拒绝非会话成员访问', async () => {
      const otherUser = await createTestUser('other3');
      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/chat/sessions/:id/read - 标记消息已读', () => {
    it('应该成功标记消息已读', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/read`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权操作', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/read`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chat/unread-count - 获取未读消息总数', () => {
    it('应该成功获取未读消息数', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(typeof response.body.data.count).toBe('number');
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count');

      expect(response.status).toBe(401);
    });
  });
});
