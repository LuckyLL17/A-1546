jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));
jest.mock('../../src/services/notificationService', () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/itemService', () => ({
  getItemById: jest.fn(),
  getItemDetail: jest.fn(),
}));
jest.mock('../../src/services/userService', () => ({
  getUserPublicInfo: jest.fn(),
  updateCreditScore: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';
import { createMockConnection } from '../../tests/helpers/testUtils';
import * as itemService from '../../src/services/itemService';

const buyerToken = generateToken({ userId: 'buyer-uuid-123', username: 'buyer' });
const sellerToken = generateToken({ userId: 'seller-uuid-123', username: 'seller' });
const thirdPartyToken = generateToken({ userId: 'third-party-uuid-123', username: 'thirdparty' });

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ORDER_UUID = '660e8400-e29b-41d4-a716-446655440001';

const mockPublishedItem = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  seller_id: 'seller-uuid-123',
  category_id: 1,
  title: '二手MacBook Pro',
  description: '95新，配件齐全',
  original_price: 15000,
  price: 8000,
  condition_level: 'good',
  images: null,
  location: '北京大学',
  status: 'published',
  view_count: 10,
  like_count: 2,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

const mockDraftItem = {
  ...mockPublishedItem,
  status: 'draft',
};

const mockZeroPriceItem = {
  ...mockPublishedItem,
  price: 0,
};

const pendingOrder = {
  id: ORDER_UUID,
  order_no: '20250109120000123456',
  item_id: VALID_UUID,
  seller_id: 'seller-uuid-123',
  buyer_id: 'buyer-uuid-123',
  price: 8000,
  status: 'pending',
  delivery_method: 'face_to_face',
  delivery_address: null,
  remark: null,
  payment_method: null,
  payment_time: null,
  delivery_time: null,
  complete_time: null,
  created_at: new Date('2025-01-09'),
  updated_at: new Date('2025-01-09'),
};

const paidOrder = {
  ...pendingOrder,
  status: 'paid',
  payment_method: 'wechat',
  payment_time: new Date('2025-01-09'),
};

const shippingOrder = {
  ...pendingOrder,
  status: 'shipping',
  payment_method: 'wechat',
  payment_time: new Date('2025-01-09'),
  delivery_time: new Date('2025-01-10'),
};

const completedOrder = {
  ...pendingOrder,
  status: 'completed',
  payment_method: 'wechat',
  payment_time: new Date('2025-01-09'),
  delivery_time: new Date('2025-01-10'),
  complete_time: new Date('2025-01-11'),
};

const mockBuyerInfo = {
  id: 'buyer-uuid-123',
  username: 'buyer',
  avatar: null,
  school: '北京大学',
  credit_score: 100,
};

const mockSellerInfo = {
  id: 'seller-uuid-123',
  username: 'seller',
  avatar: null,
  school: '清华大学',
  credit_score: 95,
};

beforeEach(() => {
  resetMockDatabase();
  jest.clearAllMocks();
});

describe('POST /api/orders', () => {
  it('should create order successfully', async () => {
    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const { connection } = createMockConnection();
    setMockGetConnection(async () => connection as any);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        item_id: VALID_UUID,
        delivery_method: 'face_to_face',
        remark: '请小心轻放',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.orderNo).toBeDefined();
  });

  it('should return error when item_id is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ item_id: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('物品ID不能为空');
  });

  it('should return error when item_id is invalid UUID', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ item_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的物品ID');
  });

  it('should return error when delivery_method is invalid', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ item_id: VALID_UUID, delivery_method: 'invalid_method' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的交付方式');
  });

  it('should return error when item is not published', async () => {
    (itemService.getItemById as jest.Mock).mockResolvedValue(mockDraftItem);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ item_id: VALID_UUID });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(3005);
  });

  it('should return error when buyer purchases own item', async () => {
    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ item_id: VALID_UUID });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4002);
  });

  it('should return error when item price is zero or negative', async () => {
    (itemService.getItemById as jest.Mock).mockResolvedValue(mockZeroPriceItem);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ item_id: VALID_UUID });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(1001);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ item_id: VALID_UUID });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('GET /api/orders/:id', () => {
  it('should return order detail with buyer token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      if (sql.includes('FROM reviews')) {
        return [] as any;
      }
      return [] as any;
    });

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);
    (itemService.getItemDetail as jest.Mock).mockResolvedValue({ ...mockPublishedItem, seller: mockSellerInfo });
    const { getUserPublicInfo } = require('../../src/services/userService');
    getUserPublicInfo.mockImplementation((id: string) => {
      if (id === 'buyer-uuid-123') return Promise.resolve(mockBuyerInfo);
      if (id === 'seller-uuid-123') return Promise.resolve(mockSellerInfo);
      return Promise.resolve(null);
    });

    const res = await request(app)
      .get(`/api/orders/${ORDER_UUID}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(ORDER_UUID);
  });

  it('should return error for invalid order ID format', async () => {
    const res = await request(app)
      .get('/api/orders/invalid-id')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('无效的订单ID或订单号');
  });

  it('should return 403 when third-party user accesses order', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .get(`/api/orders/${ORDER_UUID}`)
      .set('Authorization', `Bearer ${thirdPartyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(1103);
  });
});

describe('POST /api/orders/:id/pay', () => {
  it('should pay order successfully with pending order and buyer token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ payment_method: 'wechat' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('支付成功');
  });

  it('should return error when payment_method is empty', async () => {
    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ payment_method: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('支付方式不能为空');
  });

  it('should return error when order status is not pending', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [paidOrder] as any;
      }
      return [] as any;
    });

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ payment_method: 'wechat' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4001);
  });

  it('should return error when seller tries to pay', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/pay`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ payment_method: 'wechat' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(1103);
  });
});

describe('POST /api/orders/:id/ship', () => {
  it('should ship order successfully with paid order and seller token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [paidOrder] as any;
      }
      return [] as any;
    });
    setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/ship`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('发货成功');
  });

  it('should return error when order status is not paid', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/ship`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4001);
  });

  it('should return error when buyer tries to ship', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [paidOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/ship`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(1103);
  });
});

describe('POST /api/orders/:id/complete', () => {
  it('should complete order successfully with shipping order and buyer token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [shippingOrder] as any;
      }
      return [] as any;
    });

    const { connection } = createMockConnection();
    setMockGetConnection(async () => connection as any);

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/complete`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('确认收货成功');
  });

  it('should return error when order status is not shipping', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [paidOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/complete`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4001);
  });

  it('should return error when seller tries to complete', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [shippingOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/complete`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(1103);
  });
});

describe('POST /api/orders/:id/cancel', () => {
  it('should cancel order successfully with pending order and buyer token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });

    const { connection } = createMockConnection();
    setMockGetConnection(async () => connection as any);

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('取消成功');
  });

  it('should return error when order status does not allow cancellation', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [completedOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4001);
  });

  it('should return error when third-party user tries to cancel', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [pendingOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/cancel`)
      .set('Authorization', `Bearer ${thirdPartyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(1103);
  });
});

describe('GET /api/orders/buyer', () => {
  it('should return buyer orders with buyer token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [{ ...pendingOrder, item_title: '二手MacBook Pro', item_images: null, item_price: 8000 }] as any;
    });

    const res = await request(app)
      .get('/api/orders/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/orders/buyer');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('GET /api/orders/seller', () => {
  it('should return seller orders with seller token', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [{ ...pendingOrder, item_title: '二手MacBook Pro', item_images: null, item_price: 8000 }] as any;
    });

    const res = await request(app)
      .get('/api/orders/seller')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/orders/seller');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

describe('POST /api/orders/:id/review', () => {
  it('should create review successfully with completed order', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [completedOrder] as any;
      }
      if (sql.includes('FROM reviews') && sql.includes('order_id')) {
        return [] as any;
      }
      return [] as any;
    });
    setMockExecute(async () => ({ affectedRows: 1, insertId: 42 } as any));

    (itemService.getItemById as jest.Mock).mockResolvedValue(mockPublishedItem);

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 5, content: '非常好的卖家', is_anonymous: false });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(42);
  });

  it('should return error when rating is 0', async () => {
    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 0 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('评分必须是1-5的整数');
  });

  it('should return error when rating is 6', async () => {
    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('评分必须是1-5的整数');
  });

  it('should return error when rating is missing', async () => {
    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: '不错' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(-1);
    expect(res.body.message).toBe('评分不能为空');
  });

  it('should return error when order is not completed', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [shippingOrder] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4001);
  });

  it('should return error when already reviewed', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('FROM orders')) {
        return [completedOrder] as any;
      }
      if (sql.includes('FROM reviews') && sql.includes('order_id')) {
        return [{ id: 1 }] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .post(`/api/orders/${ORDER_UUID}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(4003);
  });
});

describe('GET /api/users/:id/reviews', () => {
  it('should return paginated reviews list', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 1 }] as any;
      }
      return [{
        id: 1,
        order_id: ORDER_UUID,
        reviewer_id: 'buyer-uuid-123',
        reviewed_id: 'seller-uuid-123',
        rating: 5,
        content: '非常好',
        images: null,
        is_anonymous: 0,
        reviewer_username: 'buyer',
        reviewer_avatar: null,
        created_at: new Date('2025-01-12'),
      }] as any;
    });

    const res = await request(app)
      .get(`/api/users/${VALID_UUID}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('should return empty list when no reviews', async () => {
    setMockQuery(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total: 0 }] as any;
      }
      return [] as any;
    });

    const res = await request(app)
      .get(`/api/users/${VALID_UUID}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });
});
