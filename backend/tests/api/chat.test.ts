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
const OTHER_USER_UUID = 'b2c3d4e5-f6a7-4890-bcde-f12345678901';

describe('Chat API', () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe('GET /api/chat/sessions', () => {
    it('should return paginated session list', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return [{ total: 1 }] as any;
        }
        return [{
          id: VALID_UUID,
          user1_id: USER_ID,
          user2_id: OTHER_USER_UUID,
          other_user_id: OTHER_USER_UUID,
          other_username: 'otheruser',
          other_avatar: null,
          last_message: 'Hello',
          unread_count: 2,
        }] as any;
      });

      const res = await request(app)
        .get('/api/chat/sessions')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/chat/sessions');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/chat/sessions/:id/messages', () => {
    it('should return paginated messages', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('chat_sessions')) {
          return [{ id: VALID_UUID, user1_id: USER_ID, user2_id: OTHER_USER_UUID }] as any;
        }
        if (sql.includes('COUNT(*)')) {
          return [{ total: 2 }] as any;
        }
        return [
          { id: 1, session_id: VALID_UUID, sender_id: USER_ID, content: 'Hi', message_type: 'text', is_read: 1, sender_username: 'testuser', sender_avatar: null },
          { id: 2, session_id: VALID_UUID, sender_id: OTHER_USER_UUID, content: 'Hello', message_type: 'text', is_read: 0, sender_username: 'otheruser', sender_avatar: null },
        ] as any;
      });
      setMockExecute(async () => ({ affectedRows: 2, insertId: 0 } as any));

      const res = await request(app)
        .get(`/api/chat/sessions/${VALID_UUID}/messages`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(2);
    });

    it('should return 400 for invalid UUID session id', async () => {
      const res = await request(app)
        .get('/api/chat/sessions/invalid-uuid/messages')
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的会话ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`/api/chat/sessions/${VALID_UUID}/messages`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/chat/sessions/:id/read', () => {
    it('should mark session as read', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('chat_sessions')) {
          return [{ id: VALID_UUID, user1_id: USER_ID, user2_id: OTHER_USER_UUID }] as any;
        }
        return [] as any;
      });
      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const res = await request(app)
        .post(`/api/chat/sessions/${VALID_UUID}/read`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('标记成功');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post('/api/chat/sessions/invalid-uuid/read')
        .set(authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的会话ID');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post(`/api/chat/sessions/${VALID_UUID}/read`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/chat/messages', () => {
    it('should send message successfully', async () => {
      setMockQuery(async (sql: string) => {
        if (sql.includes('chat_sessions') && sql.includes('SELECT *')) {
          return [{ id: VALID_UUID, user1_id: USER_ID, user2_id: OTHER_USER_UUID }] as any;
        }
        return [] as any;
      });

      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn()
          .mockResolvedValueOnce([{ affectedRows: 1, insertId: 42 }])
          .mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }]),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
      };
      setMockGetConnection(async () => mockConnection as any);

      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ session_id: VALID_UUID, content: 'Hello there!', message_type: 'text' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(42);
    });

    it('should return 400 for empty content', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ session_id: VALID_UUID, content: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('消息内容不能为空');
    });

    it('should return 400 for content exceeding 1000 chars', async () => {
      const longContent = 'x'.repeat(1001);

      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ session_id: VALID_UUID, content: longContent });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('消息内容不能超过1000个字符');
    });

    it('should return 400 when neither session_id nor receiver_id provided', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('必须提供会话ID或接收者ID');
    });

    it('should return 400 for invalid session_id UUID', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ session_id: 'invalid-uuid', content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的会话ID');
    });

    it('should return 400 for invalid receiver_id UUID', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ receiver_id: 'invalid-uuid', content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的接收者ID');
    });

    it('should return 400 when receiver_id is same as sender', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ receiver_id: USER_ID, content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('不能给自己发消息');
    });

    it('should return 400 for invalid message_type', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .set(authHeader)
        .send({ receiver_id: OTHER_USER_UUID, content: 'Hello', message_type: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的消息类型');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/chat/messages')
        .send({ session_id: VALID_UUID, content: 'Hello' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/chat/unread-count', () => {
    it('should return unread count', async () => {
      setMockQuery(async () => {
        return [{ count: 5 }] as any;
      });

      const res = await request(app)
        .get('/api/chat/unread-count')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.count).toBe(5);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/chat/unread-count');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
