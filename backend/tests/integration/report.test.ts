import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestItem } from '../helpers/testHelper';

describe('举报模块 API 测试', () => {
  let reporter: { id: string; token: string };
  let reportedUser: { id: string; token: string };
  let itemId: string;

  beforeAll(async () => {
    const reporterUser = await createTestUser('reporter');
    reporter = { id: reporterUser.id, token: reporterUser.token };
    
    const reportedUserObj = await createTestUser('reported');
    reportedUser = { id: reportedUserObj.id, token: reportedUserObj.token };

    const testItem = await createTestItem(reportedUser.token);
    itemId = testItem.id;
  });

  describe('POST /api/reports - 创建举报', () => {
    it('应该成功举报用户', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          target_type: 'user',
          target_id: reportedUser.id,
          reason: '违规行为',
          description: '该用户存在违规交易行为',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBeDefined();
    });

    it('应该成功举报物品', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          target_type: 'item',
          target_id: itemId,
          reason: '违禁物品',
          description: '该物品违反平台规定',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权举报', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          target_type: 'user',
          target_id: reportedUser.id,
          reason: '测试举报',
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝缺少必填参数的举报', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          description: '只有描述',
        });

      expect(response.status).toBe(400);
    });

    it('应该拒绝无效的举报类型', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          target_type: 'invalid_type',
          target_id: '123',
          reason: '测试',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reports/my - 获取我的举报记录', () => {
    it('应该成功获取我的举报列表', async () => {
      const response = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${reporter.token}`)
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该支持按状态筛选', async () => {
      const response = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${reporter.token}`)
        .query({ status: 'pending', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${reporter.token}`)
        .query({ target_type: 'user', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/reports/my');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/:id - 获取举报详情', () => {
    let reportId: number;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          target_type: 'user',
          target_id: reportedUser.id,
          reason: '测试举报详情',
        });
      reportId = createResponse.body.data.id;
    });

    it('应该成功获取举报详情', async () => {
      const response = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${reporter.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(reportId);
    });

    it('应该拒绝非举报人访问', async () => {
      const otherUser = await createTestUser('other');
      const response = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });

    it('应该返回404当举报不存在', async () => {
      const response = await request(app)
        .get('/api/reports/99999')
        .set('Authorization', `Bearer ${reporter.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/reports/:id - 撤销举报', () => {
    let reportId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          target_type: 'item',
          target_id: itemId,
          reason: '测试撤销举报',
        });
      reportId = createResponse.body.data.id;
    });

    it('应该成功撤销待处理的举报', async () => {
      const response = await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({
          status: 'cancelled',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝非举报人撤销', async () => {
      const otherUser = await createTestUser('other2');
      const response = await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({
          status: 'cancelled',
        });

      expect(response.status).toBe(403);
    });
  });
});
