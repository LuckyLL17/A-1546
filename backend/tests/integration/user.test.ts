import request from 'supertest';
import app from '../../src/app';
import { generateUniqueUsername, generateUniqueEmail } from '../helpers/testHelper';

describe('用户模块 API 测试', () => {
  let testUser: {
    username: string;
    email: string;
    password: string;
    token?: string;
    userId?: string;
  };

  beforeEach(() => {
    testUser = {
      username: generateUniqueUsername(),
      email: generateUniqueEmail(),
      password: 'testpass123',
    };
  });

  describe('POST /api/users/register - 用户注册', () => {
    it('应该成功注册新用户', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('注册成功');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.credit_score).toBe(100);
      expect(response.body.data.user.status).toBe('active');

      testUser.token = response.body.data.token;
      testUser.userId = response.body.data.user.id;
    });

    it('应该拒绝重复用户名注册', async () => {
      await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: 'anotherpass',
          email: 'another@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(2001);
      expect(response.body.message).toBe('用户名已被使用');
    });

    it('应该拒绝重复邮箱注册', async () => {
      await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'anotheruser',
          password: 'anotherpass',
          email: testUser.email,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(2002);
      expect(response.body.message).toBe('邮箱已被注册');
    });

    it('应该拒绝缺少必填参数的注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/users/login - 用户登录', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });
    });

    it('应该成功登录（用户名登录）', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('应该成功登录（邮箱登录）', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('登录成功');
    });

    it('应该拒绝错误密码登录', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(2003);
    });

    it('应该拒绝不存在的用户登录', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'nonexistent',
          password: testUser.password,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(2003);
    });
  });

  describe('GET /api/users/profile - 获取个人信息', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });
      testUser.token = registerResponse.body.data.token;
      testUser.userId = registerResponse.body.data.user.id;
    });

    it('应该成功获取个人信息', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.username).toBe(testUser.username);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.credit_score).toBe(100);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });

    it('应该拒绝无效Token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile - 更新个人信息', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });
      testUser.token = registerResponse.body.data.token;
      testUser.userId = registerResponse.body.data.user.id;
    });

    it('应该成功更新个人信息', async () => {
      const updateData = {
        real_name: '测试用户',
        phone: '13800138000',
        school: '测试大学',
        campus: '测试校区',
        dormitory: '测试宿舍',
        student_id: '2021001',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新成功');

      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(profileResponse.body.data.real_name).toBe(updateData.real_name);
      expect(profileResponse.body.data.phone).toBe(updateData.phone);
      expect(profileResponse.body.data.school).toBe(updateData.school);
    });

    it('应该拒绝未授权更新', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ real_name: '测试' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/password - 修改密码', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });
      testUser.token = registerResponse.body.data.token;
      testUser.userId = registerResponse.body.data.user.id;
    });

    it('应该成功修改密码', async () => {
      const newPassword = 'newpassword123';
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          old_password: testUser.password,
          new_password: newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('密码修改成功');

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.username,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.code).toBe(0);
    });

    it('应该拒绝错误的旧密码', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          old_password: 'wrongoldpassword',
          new_password: 'newpassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(2003);
    });

    it('应该拒绝未授权修改密码', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .send({
          old_password: testUser.password,
          new_password: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/:id - 获取用户公开信息', () => {
    let otherUserId: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: testUser.username,
          password: testUser.password,
          email: testUser.email,
        });
      testUser.token = registerResponse.body.data.token;
      testUser.userId = registerResponse.body.data.user.id;

      const otherUserResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: generateUniqueUsername(),
          password: 'otherpass123',
          email: generateUniqueEmail(),
        });
      otherUserId = otherUserResponse.body.data.user.id;
    });

    it('应该成功获取用户公开信息', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(otherUserId);
      expect(response.body.data.username).toBeDefined();
      expect(response.body.data.credit_score).toBe(100);
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.email).toBeUndefined();
    });

    it('应该返回404对于不存在的用户', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(2000);
    });
  });
});
