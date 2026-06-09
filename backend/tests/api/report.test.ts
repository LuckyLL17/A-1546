jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, resetMockDatabase } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';

const token = generateToken({ userId: 'user-uuid-123', username: 'testuser' });
const authHeader = { Authorization: `Bearer ${token}` };

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('Report API', () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe('POST /api/reports', () => {
    it('should create report successfully', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 10 } as any));

      const res = await request(app)
        .post('/api/reports')
        .set(authHeader)
        .send({
          target_type: 'user',
          target_id: VALID_UUID,
          reason: '违规行为',
          description: '该用户发布虚假信息',
          images: ['https://example.com/evidence.jpg'],
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(10);
    });

    it('should return 400 for invalid target_type', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set(authHeader)
        .send({
          target_type: 'invalid_type',
          target_id: VALID_UUID,
          reason: '违规',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的举报目标类型');
    });

    it('should return 400 for empty target_id', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set(authHeader)
        .send({
          target_type: 'user',
          target_id: '',
          reason: '违规',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('举报目标ID不能为空');
    });

    it('should return 400 for empty reason', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set(authHeader)
        .send({
          target_type: 'user',
          target_id: VALID_UUID,
          reason: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('举报原因不能为空');
    });

    it('should return 400 for reason exceeding 255 chars', async () => {
      const longReason = 'r'.repeat(256);

      const res = await request(app)
        .post('/api/reports')
        .set(authHeader)
        .send({
          target_type: 'item',
          target_id: VALID_UUID,
          reason: longReason,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('举报原因不能超过255个字符');
    });

    it('should accept all valid target types', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 1 } as any));

      const targetTypes = ['user', 'item', 'resource', 'message'];

      for (const targetType of targetTypes) {
        resetMockDatabase();
        setMockExecute(async () => ({ affectedRows: 1, insertId: 1 } as any));

        const res = await request(app)
          .post('/api/reports')
          .set(authHeader)
          .send({
            target_type: targetType,
            target_id: VALID_UUID,
            reason: `${targetType}违规`,
          });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
      }
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          target_type: 'user',
          target_id: VALID_UUID,
          reason: '违规',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/reports/my', () => {
    it('should return paginated report list', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 1 }] as any;
        }
        return [{
          id: 1,
          reporter_id: 'user-uuid-123',
          target_type: 'user',
          target_id: VALID_UUID,
          reason: '违规行为',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
        }] as any;
      });

      const res = await request(app)
        .get('/api/reports/my')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should support pagination parameters', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 0 }] as any;
        }
        return [] as any;
      });

      const res = await request(app)
        .get('/api/reports/my')
        .query({ page: 2, page_size: 5 })
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(0);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/reports/my');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
