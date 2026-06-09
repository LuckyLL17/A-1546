import request from 'supertest';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
  credit_score: number;
  status: string;
}

export interface TestItem {
  id: string;
  seller_id: string;
  title: string;
  price: number;
  status: string;
}

export interface TestOrder {
  id: string;
  order_no: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  price: number;
  status: string;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = overrides.id || uuidv4();
  const username = overrides.username || `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const email = overrides.email || `${username}@test.com`;
  const password = overrides.password || 'testpass123';

  const token = jwt.sign(
    { userId: id, username, email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return {
    id,
    username,
    email,
    password,
    token,
    credit_score: 100,
    status: 'active',
    ...overrides
  };
};

export const createTestItem = (sellerId: string, overrides: Partial<TestItem> = {}): TestItem => {
  return {
    id: overrides.id || uuidv4(),
    seller_id: sellerId,
    title: overrides.title || '测试物品',
    price: overrides.price || 99.99,
    status: overrides.status || 'published',
    ...overrides
  };
};

export const createTestOrder = (
  itemId: string,
  sellerId: string,
  buyerId: string,
  overrides: Partial<TestOrder> = {}
): TestOrder => {
  return {
    id: overrides.id || uuidv4(),
    order_no: overrides.order_no || `ORD${Date.now()}`,
    item_id: itemId,
    seller_id: sellerId,
    buyer_id: buyerId,
    price: overrides.price || 99.99,
    status: overrides.status || 'pending',
    ...overrides
  };
};

export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export const mockDatabase = {
  mockQuery: jest.fn(),
  mockExecute: jest.fn(),
  mockGetConnection: jest.fn(),
};

jest.mock('../src/utils/database', () => ({
  initDatabase: jest.fn(),
  getPool: jest.fn(() => ({
    query: mockDatabase.mockQuery,
    execute: mockDatabase.mockExecute,
    getConnection: mockDatabase.mockGetConnection,
  })),
  getConnection: mockDatabase.mockGetConnection,
  query: mockDatabase.mockQuery,
  execute: mockDatabase.mockExecute,
  closeDatabase: jest.fn(),
}));

beforeEach(() => {
  mockDatabase.mockQuery.mockReset();
  mockDatabase.mockExecute.mockReset();
  mockDatabase.mockGetConnection.mockReset();
});

export const successResponse = (data?: any, message = '操作成功') => ({
  code: 0,
  message,
  data,
  timestamp: expect.any(Number),
});

export const errorResponse = (code: number, message: string) => ({
  code,
  message,
  timestamp: expect.any(Number),
});

export const paginatedResponse = (list: any[], total: number, page = 1, pageSize = 10) => ({
  code: 0,
  message: expect.any(String),
  data: {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  },
  timestamp: expect.any(Number),
});
