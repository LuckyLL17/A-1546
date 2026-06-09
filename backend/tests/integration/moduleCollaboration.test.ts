jest.mock('../../src/utils/database', () => require('../../tests/__mocks__/database'));
jest.mock('../../src/utils/logger', () => ({ default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), request: jest.fn(), business: jest.fn() }, __esModule: true }));
jest.mock('bcryptjs', () => {
  const mockCompare = jest.fn().mockResolvedValue(true);
  const mockHash = jest.fn().mockResolvedValue('$2a$10$hashedpassword');
  return { __esModule: true, default: { compare: mockCompare, hash: mockHash }, compare: mockCompare, hash: mockHash };
});

import request from 'supertest';
import app from '../../tests/testApp';
import { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase } from '../../tests/helpers/testUtils';
import { generateToken } from '../../src/middleware/auth';
import { createMockConnection, createRowPacket } from '../../tests/helpers/testUtils';

const SELLER_ID = 'a0000000-0000-4000-8000-000000000001';
const BUYER_ID = 'b0000000-0000-4000-8000-000000000002';
const SELLER_USERNAME = 'seller01';
const BUYER_USERNAME = 'buyer01';
const ITEM_ID = 'c0000000-0000-4000-8000-000000000003';
const ORDER_ID = 'd0000000-0000-4000-8000-000000000004';
const RESOURCE_ID = 'e0000000-0000-4000-8000-000000000005';
const SESSION_ID = 'f0000000-0000-4000-8000-000000000006';
const NOTIFICATION_ID = 1;
const REPORT_ID = 1;

const sellerToken = generateToken({ userId: SELLER_ID, username: SELLER_USERNAME });
const buyerToken = generateToken({ userId: BUYER_ID, username: BUYER_USERNAME });

const HASHED_PASSWORD = '$2a$10$hashedpassword';

function getMockCalls(mockFn: jest.Mock): string[] {
  return mockFn.mock.calls.map((call: any[]) => call[0] as string);
}

const mockQuery = (fn: (sql: string, params?: any[]) => any[] | Promise<any[]>) => setMockQuery(fn as any);
const mockGetConnection = (fn: () => any) => setMockGetConnection(fn as any);

describe('Module Collaboration Integration Tests', () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe('1. User Registration -> Login -> Profile Flow', () => {
    test('should register, login, get profile, and update profile end-to-end', async () => {
      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT id FROM users WHERE username')) return [];
        if (sql.includes('SELECT id FROM users WHERE email')) return [];
        if (sql.includes('SELECT * FROM users WHERE username')) {
          return [createRowPacket({
            id: SELLER_ID, username: SELLER_USERNAME, password: HASHED_PASSWORD,
            email: 'seller@test.com', phone: null, real_name: null,
            student_id: null, avatar: null, school: null, campus: null,
            dormitory: null, credit_score: 100, status: 'active',
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM users WHERE id')) {
          return [createRowPacket({
            id: SELLER_ID, username: SELLER_USERNAME, password: HASHED_PASSWORD,
            email: 'seller@test.com', phone: null, real_name: 'Test Seller',
            student_id: null, avatar: null, school: 'Test University', campus: null,
            dormitory: null, credit_score: 100, status: 'active',
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      setMockExecute(async () => ({ affectedRows: 1, insertId: 1 } as any));

      const registerRes = await request(app)
        .post('/api/users/register')
        .send({ username: SELLER_USERNAME, password: 'Test1234', email: 'seller@test.com' });
      expect(registerRes.status).toBe(200);
      expect(registerRes.body.code).toBe(0);
      expect(registerRes.body.data).toHaveProperty('userId');
      expect(registerRes.body.data).toHaveProperty('token');

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ username: SELLER_USERNAME, password: 'Test1234' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.code).toBe(0);
      expect(loginRes.body.data).toHaveProperty('token');
      expect(loginRes.body.data.user.username).toBe(SELLER_USERNAME);

      const loginToken = loginRes.body.data.token;

      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${loginToken}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.code).toBe(0);
      expect(profileRes.body.data.username).toBe(SELLER_USERNAME);

      const updateRes = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ real_name: 'Test Seller', school: 'Test University' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.code).toBe(0);
      expect(updateRes.body.data.real_name).toBe('Test Seller');
      expect(updateRes.body.data.school).toBe('Test University');
    });
  });

  describe('2. Item Lifecycle: Create -> Publish -> Search -> Detail Flow', () => {
    test('should create, publish, search, and get item detail', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 1 } as any));

      const createRes = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test Item', price: 99.99, condition_level: 'good' });
      expect(createRes.status).toBe(200);
      expect(createRes.body.code).toBe(0);
      expect(createRes.body.data).toHaveProperty('id');

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'draft', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const publishRes = await request(app)
        .post(`/api/items/${ITEM_ID}/publish`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(publishRes.status).toBe(200);
      expect(publishRes.body.code).toBe(0);

      mockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*) as total') && sql.includes('items i')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT i.*') && sql.includes('FROM items i')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'published', created_at: new Date(), updated_at: new Date(),
            seller_username: SELLER_USERNAME, seller_avatar: null,
          })];
        }
        return [];
      });

      const searchRes = await request(app)
        .get('/api/items?keyword=Test');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.code).toBe(0);
      expect(searchRes.body.data.list.length).toBeGreaterThan(0);
      expect(searchRes.body.data.list[0].status).toBe('published');

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT i.*') && sql.includes('JOIN users u')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 1, like_count: 0,
            status: 'published', created_at: new Date(), updated_at: new Date(),
            seller_user_id: SELLER_ID, seller_username: SELLER_USERNAME,
            seller_avatar: null, seller_credit_score: 100,
          })];
        }
        if (sql.includes('SELECT id FROM item_favorites')) {
          return [];
        }
        return [];
      });

      const detailRes = await request(app)
        .get(`/api/items/${ITEM_ID}`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.code).toBe(0);
      expect(detailRes.body.data.title).toBe('Test Item');
      expect(detailRes.body.data.seller.username).toBe(SELLER_USERNAME);
    });
  });

  describe('3. Full Order Lifecycle: Item -> Order -> Pay -> Ship -> Complete', () => {
    test('should transition order through all statuses and update item status', async () => {
      const { connection, mockExecute } = createMockConnection();
      mockGetConnection(async () => connection);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'published', created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'pending', payment_method: null, payment_time: null,
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: null, complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ item_id: ITEM_ID, delivery_method: 'face_to_face' });
      expect(createOrderRes.status).toBe(200);
      expect(createOrderRes.body.code).toBe(0);
      expect(createOrderRes.body.data).toHaveProperty('orderId');
      expect(createOrderRes.body.data).toHaveProperty('orderNo');

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'pending', payment_method: null, payment_time: null,
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: null, complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'reserved', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const payRes = await request(app)
        .post(`/api/orders/${ORDER_ID}/pay`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ payment_method: 'alipay' });
      expect(payRes.status).toBe(200);
      expect(payRes.body.code).toBe(0);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'paid', payment_method: 'alipay', payment_time: new Date(),
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: null, complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'reserved', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const shipRes = await request(app)
        .post(`/api/orders/${ORDER_ID}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(shipRes.status).toBe(200);
      expect(shipRes.body.code).toBe(0);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'shipping', payment_method: 'alipay', payment_time: new Date(),
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: new Date(), complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'reserved', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const completeRes = await request(app)
        .post(`/api/orders/${ORDER_ID}/complete`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.code).toBe(0);

      const completeCalls = getMockCalls(mockExecute as jest.Mock);
      const updateOrderCall = completeCalls.find((sql: string) => sql.includes('UPDATE orders SET status = "completed"'));
      const updateItemCall = completeCalls.find((sql: string) => sql.includes('UPDATE items SET status = "sold"'));
      const updateCreditCall = completeCalls.find((sql: string) => sql.includes('UPDATE users SET credit_score = credit_score + 5'));
      expect(updateOrderCall).toBeDefined();
      expect(updateItemCall).toBeDefined();
      expect(updateCreditCall).toBeDefined();
    });
  });

  describe('4. Order -> Review -> Credit Score Flow', () => {
    test('should create review and adjust credit score', async () => {
      const mockDbExecute = jest.fn().mockResolvedValue({ affectedRows: 1, insertId: 1 } as any);
      setMockExecute(mockDbExecute);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'completed', payment_method: 'alipay', payment_time: new Date(),
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: new Date(), complete_time: new Date(), remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT id FROM reviews WHERE order_id')) {
          return [];
        }
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, title: 'Test Item',
            price: 99.99, status: 'sold', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const reviewRes = await request(app)
        .post(`/api/orders/${ORDER_ID}/review`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5, content: 'Great seller!' });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.code).toBe(0);

      const allExecuteCalls = getMockCalls(mockDbExecute);
      const insertReviewCall = allExecuteCalls.find((sql: string) => sql.includes('INSERT INTO reviews'));
      expect(insertReviewCall).toBeDefined();

      const creditUpdateCall = allExecuteCalls.find((sql: string) => sql.includes('UPDATE users SET credit_score'));
      expect(creditUpdateCall).toBeDefined();
    });
  });

  describe('5. Chat Between Users About an Item', () => {
    test('should send message, check sessions, read messages, and check unread count', async () => {
      const { connection } = createMockConnection();
      mockGetConnection(async () => connection);

      mockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*) as count') && sql.includes('chat_messages')) {
          return [createRowPacket({ count: 1 })];
        }
        if (sql.includes('SELECT * FROM chat_sessions WHERE id')) {
          return [createRowPacket({
            id: SESSION_ID, item_id: ITEM_ID, user1_id: SELLER_ID, user2_id: BUYER_ID,
            last_message: 'Hello about item', last_message_time: new Date(),
            created_at: new Date(),
          })];
        }
        if (sql.includes('chat_sessions') && sql.includes('user1_id') && sql.includes('user2_id')) {
          if (sql.includes('COUNT(*)')) {
            return [createRowPacket({ total: 1 })];
          }
          return [createRowPacket({
            id: SESSION_ID, item_id: ITEM_ID, user1_id: SELLER_ID, user2_id: BUYER_ID,
            last_message: 'Hello about item', last_message_time: new Date(),
            created_at: new Date(),
            other_user_id: BUYER_ID, other_username: BUYER_USERNAME, other_avatar: null,
            item_title: 'Test Item', item_images: null, unread_count: 1,
          })];
        }
        if (sql.includes('COUNT(*) as total') && sql.includes('chat_messages')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT cm.*') && sql.includes('FROM chat_messages cm')) {
          return [createRowPacket({
            id: 1, session_id: SESSION_ID, sender_id: SELLER_ID,
            content: 'Hello about item', message_type: 'text',
            is_read: false, created_at: new Date(),
            sender_username: SELLER_USERNAME, sender_avatar: null,
          })];
        }
        if (sql.includes('COUNT(*) as total') && sql.includes('chat_sessions')) {
          return [createRowPacket({ total: 1 })];
        }
        return [];
      });

      const sendRes = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ receiver_id: BUYER_ID, item_id: ITEM_ID, content: 'Hello about item' });
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.code).toBe(0);
      expect(sendRes.body.data).toHaveProperty('id');

      const sessionsRes = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(sessionsRes.status).toBe(200);
      expect(sessionsRes.body.code).toBe(0);
      expect(sessionsRes.body.data.list.length).toBeGreaterThan(0);

      const messagesRes = await request(app)
        .get(`/api/chat/sessions/${SESSION_ID}/messages`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(messagesRes.status).toBe(200);
      expect(messagesRes.body.code).toBe(0);
      expect(messagesRes.body.data.list.length).toBeGreaterThan(0);

      const unreadRes = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.code).toBe(0);
      expect(unreadRes.body.data.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('6. Resource: Create -> Publish -> Search -> Download Flow', () => {
    test('should create, publish, search, and download resource with download count increment', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: 1 } as any));

      const createRes = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test Resource', resource_type: 'document', is_free: true });
      expect(createRes.status).toBe(200);
      expect(createRes.body.code).toBe(0);
      expect(createRes.body.data).toHaveProperty('id');

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM shared_resources WHERE id')) {
          return [createRowPacket({
            id: RESOURCE_ID, user_id: SELLER_ID, title: 'Test Resource',
            description: null, resource_type: 'document', file_url: 'https://example.com/file.pdf',
            file_size: 1024, download_count: 0, like_count: 0, tags: null,
            is_free: true, points_required: 0, status: 'pending',
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const publishRes = await request(app)
        .post(`/api/resources/${RESOURCE_ID}/publish`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(publishRes.status).toBe(200);
      expect(publishRes.body.code).toBe(0);

      mockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*) as total') && sql.includes('shared_resources r')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT r.*') && sql.includes('FROM shared_resources r')) {
          return [createRowPacket({
            id: RESOURCE_ID, user_id: SELLER_ID, title: 'Test Resource',
            description: null, resource_type: 'document', file_url: 'https://example.com/file.pdf',
            file_size: 1024, download_count: 1, like_count: 0, tags: null,
            is_free: true, points_required: 0, status: 'approved',
            created_at: new Date(), updated_at: new Date(),
            uploader_username: SELLER_USERNAME,
          })];
        }
        return [];
      });

      const searchRes = await request(app)
        .get('/api/resources?keyword=Test');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.code).toBe(0);
      expect(searchRes.body.data.list.length).toBeGreaterThan(0);
      expect(searchRes.body.data.list[0].status).toBe('approved');

      const { connection, mockExecute } = createMockConnection();
      mockGetConnection(async () => connection);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM shared_resources WHERE id')) {
          return [createRowPacket({
            id: RESOURCE_ID, user_id: SELLER_ID, title: 'Test Resource',
            description: null, resource_type: 'document', file_url: 'https://example.com/file.pdf',
            file_size: 1024, download_count: 1, like_count: 0, tags: null,
            is_free: true, points_required: 0, status: 'approved',
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const downloadRes = await request(app)
        .post(`/api/resources/${RESOURCE_ID}/download`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body.code).toBe(0);
      expect(downloadRes.body.data).toHaveProperty('file_url');

      const downloadCalls = getMockCalls(mockExecute as jest.Mock);
      const insertDownloadCall = downloadCalls.find((sql: string) => sql.includes('INSERT INTO resource_downloads'));
      const updateCountCall = downloadCalls.find((sql: string) => sql.includes('download_count = download_count + 1'));
      expect(insertDownloadCall).toBeDefined();
      expect(updateCountCall).toBeDefined();
    });
  });

  describe('7. Notification Flow: Order Triggers Notifications', () => {
    test('should create notification when order is created and seller can see it', async () => {
      const { connection, mockExecute } = createMockConnection();
      mockGetConnection(async () => connection);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, title: 'Test Item',
            price: 99.99, status: 'published', created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'pending', delivery_method: 'face_to_face',
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('COUNT(*) as total') && sql.includes('notifications')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT * FROM notifications') && !sql.includes('COUNT')) {
          return [createRowPacket({
            id: NOTIFICATION_ID, user_id: SELLER_ID, title: '您有新的订单',
            content: '买家已下单购买您的物品', notification_type: 'order',
            related_id: ORDER_ID, is_read: false, created_at: new Date(),
          })];
        }
        return [];
      });

      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ item_id: ITEM_ID, delivery_method: 'face_to_face' });
      expect(createOrderRes.status).toBe(200);
      expect(createOrderRes.body.code).toBe(0);

      const allExecuteCalls = getMockCalls(mockExecute as jest.Mock);
      const insertOrderCall = allExecuteCalls.find((sql: string) => sql.includes('INSERT INTO orders'));
      const updateItemCall = allExecuteCalls.find((sql: string) => sql.includes('UPDATE items SET status = "reserved"'));
      expect(insertOrderCall).toBeDefined();
      expect(updateItemCall).toBeDefined();

      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(notificationsRes.status).toBe(200);
      expect(notificationsRes.body.code).toBe(0);
      expect(notificationsRes.body.data.list.length).toBeGreaterThan(0);
      expect(notificationsRes.body.data.list[0].notification_type).toBe('order');

      setMockExecute(async () => ({ affectedRows: 1, insertId: 0 } as any));

      const markReadRes = await request(app)
        .post(`/api/notifications/${NOTIFICATION_ID}/read`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(markReadRes.status).toBe(200);
      expect(markReadRes.body.code).toBe(0);
    });
  });

  describe('8. Report Flow: User Reports an Item', () => {
    test('should create report and list it', async () => {
      setMockExecute(async () => ({ affectedRows: 1, insertId: REPORT_ID } as any));

      const reportRes = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ target_type: 'item', target_id: ITEM_ID, reason: 'Prohibited item' });
      expect(reportRes.status).toBe(200);
      expect(reportRes.body.code).toBe(0);
      expect(reportRes.body.data).toHaveProperty('id');

      mockQuery(async (sql: string) => {
        if (sql.includes('COUNT(*) as total') && sql.includes('reports')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT * FROM reports WHERE reporter_id')) {
          return [createRowPacket({
            id: REPORT_ID, reporter_id: BUYER_ID, target_type: 'item',
            target_id: ITEM_ID, reason: 'Prohibited item', description: null,
            images: null, status: 'pending', result: null,
            handler_id: null, handled_at: null, created_at: new Date(),
          })];
        }
        return [];
      });

      const listRes = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.code).toBe(0);
      expect(listRes.body.data.list.length).toBeGreaterThan(0);
      expect(listRes.body.data.list[0].target_type).toBe('item');
      expect(listRes.body.data.list[0].reason).toBe('Prohibited item');
    });
  });

  describe('9. Favorite Item Flow', () => {
    test('should favorite, list favorites, and unfavorite item', async () => {
      const { connection, mockExecute } = createMockConnection();
      mockGetConnection(async () => connection);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'published', created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('COUNT(*) as total') && sql.includes('item_favorites')) {
          return [createRowPacket({ total: 1 })];
        }
        if (sql.includes('SELECT i.*') && sql.includes('FROM item_favorites f')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 1,
            status: 'published', created_at: new Date(), updated_at: new Date(),
            favorite_time: new Date(),
          })];
        }
        return [];
      });

      const favoriteRes = await request(app)
        .post(`/api/items/${ITEM_ID}/favorite`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(favoriteRes.status).toBe(200);
      expect(favoriteRes.body.code).toBe(0);

      const favCalls = getMockCalls(mockExecute as jest.Mock);
      const insertFavCall = favCalls.find((sql: string) => sql.includes('INSERT INTO item_favorites'));
      const updateLikeCountCall = favCalls.find((sql: string) => sql.includes('like_count = like_count + 1'));
      expect(insertFavCall).toBeDefined();
      expect(updateLikeCountCall).toBeDefined();

      const listRes = await request(app)
        .get('/api/items/my/favorites')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.code).toBe(0);
      expect(listRes.body.data.list.length).toBeGreaterThan(0);

      const { connection: conn2, mockExecute: mockExec2 } = createMockConnection();
      mockGetConnection(async () => conn2);

      const unfavRes = await request(app)
        .delete(`/api/items/${ITEM_ID}/favorite`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(unfavRes.status).toBe(200);
      expect(unfavRes.body.code).toBe(0);

      const unfavCalls = getMockCalls(mockExec2 as jest.Mock);
      const deleteFavCall = unfavCalls.find((sql: string) => sql.includes('DELETE FROM item_favorites'));
      const decrementLikeCall = unfavCalls.find((sql: string) => sql.includes('like_count = GREATEST(0, like_count - 1)'));
      expect(deleteFavCall).toBeDefined();
      expect(decrementLikeCall).toBeDefined();
    });
  });

  describe('10. Cancel Order and Restore Item Status', () => {
    test('should cancel order and restore item status to published', async () => {
      const { connection: createConn, mockExecute: createMockExec } = createMockConnection();
      mockGetConnection(async () => createConn);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, category_id: null,
            title: 'Test Item', description: null, original_price: null,
            price: 99.99, condition_level: 'good', images: null,
            location: null, view_count: 0, like_count: 0,
            status: 'published', created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'pending', payment_method: null, payment_time: null,
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: null, complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ item_id: ITEM_ID, delivery_method: 'face_to_face' });
      expect(createOrderRes.status).toBe(200);
      expect(createOrderRes.body.code).toBe(0);

      const createCalls = getMockCalls(createMockExec as jest.Mock);
      const reserveItemCall = createCalls.find((sql: string) => sql.includes('UPDATE items SET status = "reserved"'));
      expect(reserveItemCall).toBeDefined();

      const { connection: cancelConn, mockExecute: cancelMockExec } = createMockConnection();
      mockGetConnection(async () => cancelConn);

      mockQuery(async (sql: string) => {
        if (sql.includes('SELECT * FROM orders WHERE id')) {
          return [createRowPacket({
            id: ORDER_ID, order_no: '20260609143052123456', item_id: ITEM_ID,
            seller_id: SELLER_ID, buyer_id: BUYER_ID, price: 99.99,
            status: 'pending', payment_method: null, payment_time: null,
            delivery_method: 'face_to_face', delivery_address: null,
            delivery_time: null, complete_time: null, remark: null,
            created_at: new Date(), updated_at: new Date(),
          })];
        }
        if (sql.includes('SELECT * FROM items WHERE id')) {
          return [createRowPacket({
            id: ITEM_ID, seller_id: SELLER_ID, title: 'Test Item',
            price: 99.99, status: 'reserved', created_at: new Date(), updated_at: new Date(),
          })];
        }
        return [];
      });

      const cancelRes = await request(app)
        .post(`/api/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.code).toBe(0);

      const cancelCalls = getMockCalls(cancelMockExec as jest.Mock);
      const cancelOrderCall = cancelCalls.find((sql: string) => sql.includes('UPDATE orders SET status = "cancelled"'));
      const restoreItemCall = cancelCalls.find((sql: string) => sql.includes('UPDATE items SET status = "published"'));
      expect(cancelOrderCall).toBeDefined();
      expect(restoreItemCall).toBeDefined();
    });
  });
});
