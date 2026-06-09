jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';

const USER_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
const token = generateToken({ userId: USER_ID, username: 'testuser' });
const authHeader = { Authorization: `Bearer ${token}` };

const VALID_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
const OTHER_UUID = 'b2c3d4e5-f6a7-4890-bcde-f12345678901';

describe('Resource API', () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe('GET /api/resources', () => {
    it('should return paginated resource list', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 1 }] as any;
        }
        return [{ id: VALID_UUID, title: 'Test Resource', resource_type: 'document', is_free: 1, uploader_username: 'testuser' }] as any;
      });

      const res = await request(app).get('/api/resources');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should support search with query parameters', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 0 }] as any;
        }
        return [] as any;
      });

      const res = await request(app)
        .get('/api/resources')
        .query({ keyword: 'test', resource_type: 'document', is_free: 'true', tags: 'tag1', sort_by: 'time_desc', page: 1, page_size: 10 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('GET /api/resources/my/list', () => {
    it('should return my resources with auth', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 2 }] as any;
        }
        return [
          { id: VALID_UUID, title: 'My Resource 1', user_id: USER_ID },
          { id: OTHER_UUID, title: 'My Resource 2', user_id: USER_ID },
        ] as any;
      });

      const res = await request(app)
        .get('/api/resources/my/list')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/resources/my/list');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/resources/my/downloads', () => {
    it('should return my downloads with auth', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 1 }] as any;
        }
        return [{ id: VALID_UUID, title: 'Downloaded Resource', download_time: '2026-01-01' }] as any;
      });

      const res = await request(app)
        .get('/api/resources/my/downloads')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/resources/my/downloads');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should return resource detail with uploader info', async () => {
      setMockQuery(async () => {
        return [{
          id: VALID_UUID,
          title: 'Detail Resource',
          user_id: USER_ID,
          uploader_id: USER_ID,
          uploader_username: 'testuser',
          uploader_avatar: null,
        }] as any;
      });

      const res = await request(app).get(`/api/resources/${VALID_UUID}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.uploader).toBeDefined();
      expect(res.body.data.uploader.username).toBe('testuser');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/api/resources/invalid-uuid');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(-1);
      expect(res.body.message).toBe('无效的资源ID');
    });
  });

  describe('POST /api/resources', () => {
    it('should create resource successfully', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .post('/api/resources')
        .set(authHeader)
        .send({ title: 'New Resource', description: 'A test resource', resource_type: 'document', tags: ['test'], is_free: true, points_required: 0 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 for empty title', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader)
        .send({ title: '', resource_type: 'document' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('资源标题不能为空');
    });

    it('should return 400 for title exceeding 100 chars', async () => {
      const longTitle = 'a'.repeat(101);

      const res = await request(app)
        .post('/api/resources')
        .set(authHeader)
        .send({ title: longTitle, resource_type: 'document' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('资源标题不能超过100个字符');
    });

    it('should return 400 for invalid resource_type', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader)
        .send({ title: 'Valid Title', resource_type: 'invalid_type' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源类型');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/resources')
        .send({ title: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('PUT /api/resources/:id', () => {
    it('should update resource successfully', async () => {
      setMockQuery(async () => {
        return [{ id: VALID_UUID, title: 'Old Title', user_id: USER_ID, status: 'pending' }] as any;
      });
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .put(`/api/resources/${VALID_UUID}`)
        .set(authHeader)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .put('/api/resources/invalid-uuid')
        .set(authHeader)
        .send({ title: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .put(`/api/resources/${VALID_UUID}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('DELETE /api/resources/:id', () => {
    it('should delete resource successfully', async () => {
      setMockQuery(async () => {
        return [{ id: VALID_UUID, user_id: USER_ID, status: 'pending' }] as any;
      });
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .delete(`/api/resources/${VALID_UUID}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete('/api/resources/invalid-uuid')
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).delete(`/api/resources/${VALID_UUID}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/resources/:id/publish', () => {
    it('should publish resource successfully', async () => {
      setMockQuery(async () => {
        return [{ id: VALID_UUID, user_id: USER_ID, status: 'pending' }] as any;
      });
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .post(`/api/resources/${VALID_UUID}/publish`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('发布成功');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post('/api/resources/invalid-uuid/publish')
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post(`/api/resources/${VALID_UUID}/publish`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/resources/:id/download', () => {
    it('should download resource successfully with transaction', async () => {
      setMockQuery(async () => {
        return [{ id: VALID_UUID, user_id: OTHER_UUID, status: 'approved', is_free: 1, points_required: 0, file_url: 'https://example.com/file.pdf' }] as any;
      });

      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn().mockResolvedValue([{ affectedRows: 1, insertId: 1 }]),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };
      setMockGetConnection(async () => mockConnection as any);

      const res = await request(app)
        .post(`/api/resources/${VALID_UUID}/download`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.file_url).toBe('https://example.com/file.pdf');
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post('/api/resources/invalid-uuid/download')
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post(`/api/resources/${VALID_UUID}/download`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/resources/:id/like', () => {
    it('should like resource successfully without auth', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app).post(`/api/resources/${VALID_UUID}/like`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('点赞成功');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).post('/api/resources/invalid-uuid/like');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的资源ID');
    });
  });
});
