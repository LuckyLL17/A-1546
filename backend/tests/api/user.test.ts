import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, resetMockDatabase } from '../../tests/__mocks__/database';
import { generateToken } from '../../src/middleware/auth';
import { ErrorCode } from '../../src/utils/errors';

jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));

jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    request: jest.fn(),
    business: jest.fn(),
  },
  __esModule: true,
}));

const USER_ID = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const HASHED_PASSWORD = '$2a$10$0X5xyXv5yGK4BcyBUqEfZe7cu59M6jgA3Fctc.C0qbbiX/sEma2bO';

const mockUser = {
  id: USER_ID,
  username: 'testuser',
  password: HASHED_PASSWORD,
  email: 'test@example.com',
  phone: '13812345678',
  real_name: '测试用户',
  avatar: 'https://example.com/avatar.png',
  school: '测试大学',
  campus: '主校区',
  dormitory: '1号楼',
  student_id: '2021001',
  credit_score: 100,
  status: 'active',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

const createToken = (userId: string, username: string) => {
  return generateToken({ userId, username });
};

beforeEach(() => {
  resetMockDatabase();
});

describe('POST /api/users/register', () => {
  const validBody = {
    username: 'newuser',
    password: 'pass123',
    email: 'new@example.com',
  };

  it('should register successfully', async () => {
    setMockQuery(async (sql) => {
      if (sql.includes('username')) return [];
      if (sql.includes('email')) return [];
      return [];
    });
    setMockExecute(async () => ({ insertId: 1, affectedRows: 1 } as any));

    const res = await request(app).post('/api/users/register').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('注册成功');
    expect(res.body.data).toHaveProperty('userId');
    expect(res.body.data).toHaveProperty('token');
  });

  it('should return error when username is empty', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, username: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名不能为空');
  });

  it('should return error when username format is invalid - too short', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, username: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名格式不正确');
  });

  it('should return error when username format is invalid - starts with number', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, username: '1user' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名格式不正确');
  });

  it('should return error when username format is invalid - special chars', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, username: 'user@name' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名格式不正确');
  });

  it('should return error when password is empty', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, password: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('密码不能为空');
  });

  it('should return error when password format is invalid - no letter', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('密码格式不正确');
  });

  it('should return error when password format is invalid - no number', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, password: 'abcdef' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('密码格式不正确');
  });

  it('should return error when password format is invalid - too short', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, password: 'ab1' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('密码格式不正确');
  });

  it('should return error when email is empty', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, email: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('邮箱不能为空');
  });

  it('should return error when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, email: 'invalid-email' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('邮箱格式不正确');
  });

  it('should return error when phone format is invalid', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, phone: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('手机号格式不正确');
  });

  it('should return error when username already exists', async () => {
    setMockQuery(async (sql) => {
      if (sql.includes('username')) return [{ id: 'existing-user-id' }] as any;
      return [];
    });

    const res = await request(app).post('/api/users/register').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.USERNAME_EXISTS);
  });

  it('should return error when email already exists', async () => {
    setMockQuery(async (sql) => {
      if (sql.includes('username')) return [];
      if (sql.includes('email')) return [{ id: 'existing-user-id' }] as any;
      return [];
    });

    const res = await request(app).post('/api/users/register').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.EMAIL_EXISTS);
  });

  it('should register successfully with optional phone', async () => {
    setMockQuery(async () => []);
    setMockExecute(async () => ({ insertId: 1, affectedRows: 1 } as any));

    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validBody, phone: '13912345678' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('注册成功');
  });
});

describe('POST /api/users/login', () => {
  it('should login successfully', async () => {
    setMockQuery(async () => [{ ...mockUser }] as any);

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('登录成功');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('should return error when username is empty', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: '', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名不能为空');
  });

  it('should return error when password is empty', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('密码不能为空');
  });

  it('should return error when credentials are wrong', async () => {
    setMockQuery(async () => [] as any);

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: 'wrongpass1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.PASSWORD_WRONG);
  });

  it('should return error when account is banned', async () => {
    setMockQuery(async () => [{ ...mockUser, status: 'banned' }] as any);

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(ErrorCode.ACCOUNT_DISABLED);
  });

  it('should return error when account is inactive', async () => {
    setMockQuery(async () => [{ ...mockUser, status: 'inactive' }] as any);

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.ACCOUNT_INACTIVE);
  });

  it('should return error when password is incorrect', async () => {
    const wrongHash = await bcrypt.hash('differentpass1', 10);
    setMockQuery(async () => [{ ...mockUser, password: wrongHash }] as any);

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.PASSWORD_WRONG);
  });
});

describe('GET /api/users/profile', () => {
  it('should return user profile with valid token', async () => {
    const token = createToken(mockUser.id, mockUser.username);
    const { password, ...userWithoutPassword } = mockUser;
    setMockQuery(async () => [userWithoutPassword] as any);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/users/profile');

    expect(res.status).toBe(401);
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/profile', () => {
  const token = createToken(mockUser.id, mockUser.username);

  it('should update user profile successfully', async () => {
    const { password, ...userWithoutPassword } = mockUser;
    const updatedUser = { ...userWithoutPassword, real_name: '新名字' };
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));
    setMockQuery(async () => [updatedUser] as any);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ real_name: '新名字', school: '新学校' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('更新成功');
  });

  it('should return error when phone format is invalid', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('手机号格式不正确');
  });

  it('should return 401 when no token provided', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .send({ real_name: '新名字' });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/password', () => {
  const token = createToken(mockUser.id, mockUser.username);

  it('should change password successfully', async () => {
    setMockQuery(async () => [{ password: HASHED_PASSWORD }] as any);
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ old_password: 'password123', new_password: 'newpass123' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('密码修改成功');
  });

  it('should return error when old_password is empty', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ old_password: '', new_password: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('原密码不能为空');
  });

  it('should return error when new_password is empty', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ old_password: 'password123', new_password: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('新密码不能为空');
  });

  it('should return error when new_password format is invalid', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ old_password: 'password123', new_password: 'abcdef' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('新密码格式不正确');
  });

  it('should return error when old password is wrong', async () => {
    const wrongHash = await bcrypt.hash('differentpass1', 10);
    setMockQuery(async () => [{ password: wrongHash }] as any);

    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ old_password: 'password123', new_password: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.PASSWORD_WRONG);
  });

  it('should return 401 when no token provided', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .send({ old_password: 'password123', new_password: 'newpass123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/:id', () => {
  it('should return user public info', async () => {
    const publicInfo = {
      id: USER_ID,
      username: mockUser.username,
      avatar: mockUser.avatar,
      school: mockUser.school,
      credit_score: mockUser.credit_score,
      created_at: mockUser.created_at,
    };
    setMockQuery(async () => [publicInfo] as any);

    const res = await request(app).get(`/api/users/${USER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('username', mockUser.username);
  });

  it('should return error when user not found', async () => {
    setMockQuery(async () => [] as any);

    const res = await request(app).get(`/api/users/${USER_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(ErrorCode.USER_NOT_FOUND);
  });
});

describe('GET /api/users/:id/reviews', () => {
  it('should return user reviews', async () => {
    const mockReviews = [
      {
        id: 1,
        order_id: 'order-001',
        reviewer_id: 'reviewer-001',
        reviewed_id: USER_ID,
        rating: 5,
        content: '很好',
        is_anonymous: false,
        created_at: new Date('2025-01-01'),
      },
    ];
    let queryCallCount = 0;
    setMockQuery(async (sql) => {
      queryCallCount++;
      if (sql.includes('COUNT')) return [{ total: 1 }] as any;
      return mockReviews as any;
    });

    const res = await request(app).get(`/api/users/${USER_ID}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('should return empty array when no reviews', async () => {
    let queryCallCount = 0;
    setMockQuery(async (sql) => {
      queryCallCount++;
      if (sql.includes('COUNT')) return [{ total: 0 }] as any;
      return [] as any;
    });

    const res = await request(app).get(`/api/users/${USER_ID}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });
});
