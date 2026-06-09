import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(),
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  closeDatabase: jest.fn(),
}));

import * as userService from '../../src/services/userService';
import { authMiddleware, generateToken } from '../../src/middleware/auth';
import * as validator from '../../src/utils/validator';

describe('用户模块测试', () => {
  describe('输入验证器测试', () => {
    describe('isValidUsername', () => {
      it('应该接受有效的用户名', () => {
        expect(validator.isValidUsername('user123')).toBe(true);
        expect(validator.isValidUsername('test_user')).toBe(true);
        expect(validator.isValidUsername('abc')).toBe(true);
        expect(validator.isValidUsername('a1_b2-c3')).toBe(true);
      });

      it('应该拒绝无效的用户名', () => {
        expect(validator.isValidUsername('ab')).toBe(false);
        expect(validator.isValidUsername('')).toBe(false);
        expect(validator.isValidUsername('123user')).toBe(false);
        expect(validator.isValidUsername('user name')).toBe(false);
        expect(validator.isValidUsername('user@name')).toBe(false);
      });
    });

    describe('isValidPassword', () => {
      it('应该接受有效的密码', () => {
        expect(validator.isValidPassword('pass123')).toBe(true);
        expect(validator.isValidPassword('abc123456')).toBe(true);
        expect(validator.isValidPassword('Test1234')).toBe(true);
      });

      it('应该拒绝无效的密码', () => {
        expect(validator.isValidPassword('12345')).toBe(false);
        expect(validator.isValidPassword('abcdef')).toBe(false);
        expect(validator.isValidPassword('123456')).toBe(false);
        expect(validator.isValidPassword('')).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('应该接受有效的邮箱', () => {
        expect(validator.isValidEmail('test@example.com')).toBe(true);
        expect(validator.isValidEmail('user.name@domain.co')).toBe(true);
      });

      it('应该拒绝无效的邮箱', () => {
        expect(validator.isValidEmail('test@')).toBe(false);
        expect(validator.isValidEmail('@example.com')).toBe(false);
        expect(validator.isValidEmail('testexample.com')).toBe(false);
        expect(validator.isValidEmail('')).toBe(false);
      });
    });

    describe('isValidPhone', () => {
      it('应该接受有效的手机号', () => {
        expect(validator.isValidPhone('13800138000')).toBe(true);
        expect(validator.isValidPhone('15912345678')).toBe(true);
      });

      it('应该拒绝无效的手机号', () => {
        expect(validator.isValidPhone('12345')).toBe(false);
        expect(validator.isValidPhone('1380013800')).toBe(false);
        expect(validator.isValidPhone('23800138000')).toBe(false);
      });
    });
  });

  describe('JWT认证测试', () => {
    const testSecret = 'test-secret-key';
    const originalSecret = process.env.JWT_SECRET;

    beforeAll(() => {
      process.env.JWT_SECRET = testSecret;
    });

    afterAll(() => {
      process.env.JWT_SECRET = originalSecret;
    });

    it('应该生成有效的JWT Token', () => {
      const payload = { userId: uuidv4(), username: 'testuser', email: 'test@test.com' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, testSecret) as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
    });

    it('应该正确验证有效的Token', () => {
      const payload = { userId: uuidv4(), username: 'testuser', email: 'test@test.com' };
      const token = jwt.sign(payload, testSecret, { expiresIn: '1h' });
      
      const decoded = jwt.verify(token, testSecret) as any;
      expect(decoded.userId).toBe(payload.userId);
    });

    it('应该拒绝无效的Token', () => {
      expect(() => {
        jwt.verify('invalid-token', testSecret);
      }).toThrow();
    });

    it('应该检测过期的Token', (done) => {
      const payload = { userId: uuidv4(), username: 'testuser', email: 'test@test.com' };
      const token = jwt.sign(payload, testSecret, { expiresIn: '1ms' });
      
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, testSecret);
        }).toThrow(jwt.TokenExpiredError);
        done();
      }, 10);
    });
  });

  describe('密码加密测试', () => {
    it('应该正确加密密码', async () => {
      const password = 'testpass123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('应该正确验证密码', async () => {
      const password = 'testpass123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('wrongpass', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('UUID生成测试', () => {
    it('应该生成有效的UUID', () => {
      const uuid = uuidv4();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('应该生成唯一的UUID', () => {
      const uuid1 = uuidv4();
      const uuid2 = uuidv4();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
