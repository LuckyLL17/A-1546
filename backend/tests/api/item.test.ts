jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase, createMockConnection } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';

const token = generateToken({ userId: 'seller-uuid-123', username: 'testuser' });
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const mockItem = {
  id: VALID_UUID,
  seller_id: 'seller-uuid-123',
  category_id: 1,
  title: '测试物品',
  description: '测试描述',
  original_price: 100,
  price: 50,
  condition_level: 'good',
  images: null,
  location: '测试地点',
  status: 'draft',
  view_count: 0,
  like_count: 0,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const mockItemWithSeller = {
  ...mockItem,
  seller_user_id: 'seller-uuid-123',
  seller_username: 'testuser',
  seller_avatar: null,
  seller_credit_score: 100,
};

const mockCategory = {
  id: 1,
  name: '电子产品',
  parent_id: null,
  sort_order: 1,
  status: 'active',
};

const mockSubCategory = {
  id: 2,
  name: '手机',
  parent_id: 1,
  sort_order: 1,
  status: 'active',
};

beforeEach(() => {
  resetMockDatabase();
});

describe('GET /api/items', () => {
  it('should return paginated items list', async () => {
    let callCount = 0;
    setMockQuery(async (sql: string) => {
      callCount++;
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [{ ...mockItem, seller_username: 'testuser', seller_avatar: null }] as any;
    });

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
  });

  it('should pass query parameters correctly', async () => {
    let callCount = 0;
    setMockQuery(async (sql: string, params?: any[]) => {
      callCount++;
      if (sql.includes('COUNT(*)')) {
        return [{ total: 0 }] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .get('/api/items')
      .query({
        keyword: '手机',
        category_id: 1,
        min_price: 10,
        max_price: 100,
        condition_level: 'good',
        school: '北京大学',
        sort_by: 'price_asc',
        page: 2,
        page_size: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });
});

describe('GET /api/categories', () => {
  it('should return category tree structure', async () => {
    setMockQuery(async () => {
      return [mockCategory, mockSubCategory] as any;
    });

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('电子产品');
    expect(res.body.data[0].children).toHaveLength(1);
    expect(res.body.data[0].children[0].name).toBe('手机');
  });
});

describe('GET /api/items/my/list', () => {
  it('should return my items with valid token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [mockItem] as any;
    });

    const res = await request(app)
      .get('/api/items/my/list')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/items/my/list');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('GET /api/items/my/favorites', () => {
  it('should return my favorites with valid token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [mockItem] as any;
    });

    const res = await request(app)
      .get('/api/items/my/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/items/my/favorites');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('GET /api/items/:id', () => {
  it('should return item detail with seller info', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('item_favorites')) {
        return [] as any;
      }
      return [mockItemWithSeller] as any;
    });
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app).get(`/api/items/${VALID_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(VALID_UUID);
    expect(res.body.data.seller).toBeDefined();
    expect(res.body.data.is_favorited).toBe(false);
  });

  it('should return is_favorited true when user has favorited', async () => {
    let queryCallCount = 0;
    setMockQuery(async (sql: string) => {
      if (sql.includes('item_favorites')) {
        return [{ id: 1 }] as any;
      }
      return [mockItemWithSeller] as any;
    });
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .get(`/api/items/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_favorited).toBe(true);
  });

  it('should return error for invalid UUID format', async () => {
    const res = await request(app).get('/api/items/invalid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });
});

describe('POST /api/items', () => {
  it('should create item successfully', async () => {
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '测试物品',
        price: 50,
        description: '测试描述',
        condition_level: 'good',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return error when title is empty', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', price: 50 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('物品标题不能为空');
  });

  it('should return error when title exceeds 100 characters', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'a'.repeat(101), price: 50 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('物品标题不能超过100个字符');
  });

  it('should return error when price is missing', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '测试物品' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('物品价格不能为空');
  });

  it('should return error when price is invalid', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '测试物品', price: -10 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('价格格式不正确');
  });

  it('should return error when original_price is invalid', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '测试物品', price: 50, original_price: -100 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('原价格式不正确');
  });

  it('should return error when condition_level is invalid', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '测试物品', price: 50, condition_level: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('新旧程度参数不正确');
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ title: '测试物品', price: 50 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('POST /api/items/:id/publish', () => {
  it('should publish item successfully', async () => {
    setMockQuery(async () => [mockItem] as any);
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .post(`/api/items/${VALID_UUID}/publish`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('发布成功');
  });

  it('should return error for invalid UUID', async () => {
    const res = await request(app)
      .post('/api/items/invalid-uuid/publish')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).post(`/api/items/${VALID_UUID}/publish`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('PUT /api/items/:id', () => {
  it('should update item successfully', async () => {
    setMockQuery(async () => [mockItem] as any);
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .put(`/api/items/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '更新标题', price: 60 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('更新成功');
  });

  it('should return error for invalid UUID', async () => {
    const res = await request(app)
      .put('/api/items/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '更新标题' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return error for invalid price', async () => {
    setMockQuery(async () => [mockItem] as any);

    const res = await request(app)
      .put(`/api/items/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: -10 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('价格格式不正确');
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .put(`/api/items/${VALID_UUID}`)
      .send({ title: '更新标题' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('DELETE /api/items/:id', () => {
  it('should delete item successfully', async () => {
    setMockQuery(async () => [mockItem] as any);
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    const res = await request(app)
      .delete(`/api/items/${VALID_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('删除成功');
  });

  it('should return error for invalid UUID', async () => {
    const res = await request(app)
      .delete('/api/items/invalid-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).delete(`/api/items/${VALID_UUID}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('POST /api/items/:id/favorite', () => {
  it('should favorite item successfully', async () => {
    setMockQuery(async () => [mockItem] as any);
    const { connection } = createMockConnection({
      executeFn: async () => [{ affectedRows: 1, insertId: 0 } as any],
    });
    setMockGetConnection(async () => connection as any);

    const res = await request(app)
      .post(`/api/items/${VALID_UUID}/favorite`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('收藏成功');
  });

  it('should return error for invalid UUID', async () => {
    const res = await request(app)
      .post('/api/items/invalid-uuid/favorite')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).post(`/api/items/${VALID_UUID}/favorite`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('DELETE /api/items/:id/favorite', () => {
  it('should unfavorite item successfully', async () => {
    const { connection } = createMockConnection({
      executeFn: async () => [{ affectedRows: 1, insertId: 0 } as any],
    });
    setMockGetConnection(async () => connection as any);

    const res = await request(app)
      .delete(`/api/items/${VALID_UUID}/favorite`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('取消收藏成功');
  });

  it('should return error for invalid UUID', async () => {
    const res = await request(app)
      .delete('/api/items/invalid-uuid/favorite')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).delete(`/api/items/${VALID_UUID}/favorite`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});
