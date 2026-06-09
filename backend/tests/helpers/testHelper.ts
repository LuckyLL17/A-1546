import request from 'supertest';
import app from '../../src/app';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
}

export interface TestItem {
  id: string;
  title: string;
  price: number;
}

export interface TestOrder {
  id: string;
  order_no: string;
}

export const generateUniqueUsername = (prefix = 'test'): string => {
  const randomStr = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${prefix}_${timestamp}${randomStr}`.substring(0, 20);
};

export const generateUniqueEmail = (): string => {
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `test_${randomStr}@example.com`;
};

export const createTestUser = async (prefix = 'user'): Promise<TestUser> => {
  const username = generateUniqueUsername(prefix);
  const email = `${username}@example.com`;
  const password = 'testpass123';

  const response = await request(app)
    .post('/api/users/register')
    .send({
      username,
      password,
      email,
    });

  return {
    id: response.body.data?.user?.id || response.body.data?.userId,
    username,
    email,
    password,
    token: response.body.data?.token,
  };
};

export const createTestItem = async (
  sellerToken: string,
  overrides: Partial<{ title: string; price: number; description: string }> = {}
): Promise<TestItem> => {
  const response = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({
      title: overrides.title || `测试物品_${Date.now()}`,
      price: overrides.price || 99.99,
      description: overrides.description || '这是一个测试物品',
      category_id: 1,
      condition_level: 'good',
    });

  const itemId = response.body.data.id;

  await request(app)
    .post(`/api/items/${itemId}/publish`)
    .set('Authorization', `Bearer ${sellerToken}`);

  return {
    id: itemId,
    title: overrides.title || `测试物品_${Date.now()}`,
    price: overrides.price || 99.99,
  };
};

export const createTestOrder = async (
  buyerToken: string,
  itemId: string
): Promise<TestOrder> => {
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({
      item_id: itemId,
      delivery_method: 'face_to_face',
      remark: '测试订单备注',
    });

  return {
    id: response.body.data.id,
    order_no: response.body.data.order_no,
  };
};

export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
