import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/testHelper';

describe('资源共享模块 API 测试', () => {
  let user: { id: string; token: string };
  let resourceId: string;

  beforeAll(async () => {
    const testUser = await createTestUser('resource');
    user = { id: testUser.id, token: testUser.token };
  });

  describe('POST /api/resources - 创建资源', () => {
    it('应该成功创建资源', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: '测试学习资料',
          description: '这是一份测试用的学习资料',
          resource_type: 'document',
          file_url: 'https://example.com/test.pdf',
          file_size: 1024000,
          tags: ['学习', '测试'],
          is_free: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBeDefined();
      resourceId = response.body.data.id;
    });

    it('应该拒绝未授权创建资源', async () => {
      const response = await request(app)
        .post('/api/resources')
        .send({
          title: '测试资源',
          resource_type: 'document',
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝缺少必填参数的创建', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          description: '只有描述',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/resources - 获取资源列表', () => {
    it('应该成功获取资源列表', async () => {
      const response = await request(app)
        .get('/api/resources')
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app)
        .get('/api/resources')
        .query({ resource_type: 'document', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该支持关键词搜索', async () => {
      const response = await request(app)
        .get('/api/resources')
        .query({ keyword: '测试', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });
  });

  describe('GET /api/resources/:id - 获取资源详情', () => {
    it('应该成功获取资源详情', async () => {
      const response = await request(app)
        .get(`/api/resources/${resourceId}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(resourceId);
    });

    it('应该返回404当资源不存在', async () => {
      const response = await request(app)
        .get('/api/resources/nonexistent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/resources/:id/download - 下载资源', () => {
    it('应该成功记录下载', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceId}/download`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权下载', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceId}/download`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/resources/:id/like - 点赞资源', () => {
    it('应该成功点赞资源', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceId}/like`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该取消点赞', async () => {
      await request(app)
        .post(`/api/resources/${resourceId}/like`)
        .set('Authorization', `Bearer ${user.token}`);

      const response = await request(app)
        .post(`/api/resources/${resourceId}/like`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });
  });

  describe('PUT /api/resources/:id - 更新资源', () => {
    it('应该成功更新资源', async () => {
      const response = await request(app)
        .put(`/api/resources/${resourceId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: '更新后的测试资料',
          description: '更新后的描述',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝非所有者更新', async () => {
      const otherUser = await createTestUser('other');
      const response = await request(app)
        .put(`/api/resources/${resourceId}`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({
          title: '非法更新',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/resources/:id - 删除资源', () => {
    let tempResourceId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: '待删除资源',
          resource_type: 'document',
          is_free: true,
        });
      tempResourceId = createResponse.body.data.id;
    });

    it('应该成功删除资源', async () => {
      const response = await request(app)
        .delete(`/api/resources/${tempResourceId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝非所有者删除', async () => {
      const otherUser = await createTestUser('other2');
      const response = await request(app)
        .delete(`/api/resources/${tempResourceId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/resources/my - 获取我的资源', () => {
    it('应该成功获取我的资源列表', async () => {
      const response = await request(app)
        .get('/api/resources/my')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/resources/my');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/resources/downloads - 获取下载记录', () => {
    it('应该成功获取下载记录', async () => {
      const response = await request(app)
        .get('/api/resources/downloads')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/resources/downloads');

      expect(response.status).toBe(401);
    });
  });
});
