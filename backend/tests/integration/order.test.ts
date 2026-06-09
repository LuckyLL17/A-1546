import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/testHelper';

describe('订单模块 API 测试', () => {
  let seller: { id: string; token: string; username: string };
  let buyer: { id: string; token: string; username: string };
  let testItemId: string;

  beforeAll(async () => {
    const sellerUser = await createTestUser('order_seller');
    seller = { id: sellerUser.id, token: sellerUser.token, username: sellerUser.username };
    
    const buyerUser = await createTestUser('order_buyer');
    buyer = { id: buyerUser.id, token: buyerUser.token, username: buyerUser.username };

    const itemResponse = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({
        title: `订单测试物品_${Date.now()}`,
        price: 199.99,
        description: '用于订单测试的物品',
        category_id: 1,
        condition_level: 'good',
      });
    testItemId = itemResponse.body.data.id;

    await request(app)
      .post(`/api/items/${testItemId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`);
  });

  describe('POST /api/orders - 创建订单', () => {
    it('应该成功创建订单', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
          remark: '测试订单，面交',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('下单成功');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.order_no).toBeDefined();
      expect(response.body.data.item_id).toBe(testItemId);
      expect(response.body.data.seller_id).toBe(seller.id);
      expect(response.body.data.buyer_id).toBe(buyer.id);
      expect(response.body.data.status).toBe('pending');
    });

    it('应该拒绝购买自己的物品', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4002);
    });

    it('应该拒绝未授权创建订单', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          item_id: testItemId,
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝无效的交付方式', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'invalid_method',
        });

      expect(response.status).toBe(400);
    });

    it('应该拒绝快递方式缺少收货地址', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'express',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders/:id - 获取订单详情', () => {
    let orderId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      orderId = createResponse.body.data.id;
    });

    it('应该成功获取订单详情（买家）', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data.item).toBeDefined();
      expect(response.body.data.buyer).toBeDefined();
      expect(response.body.data.seller).toBeDefined();
    });

    it('应该成功获取订单详情（卖家）', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(orderId);
    });

    it('应该拒绝非订单相关人员查看', async () => {
      const thirdParty = await createTestUser('third_party');
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${thirdParty.token}`);

      expect(response.status).toBe(403);
    });

    it('应该返回404对于不存在的订单', async () => {
      const response = await request(app)
        .get('/api/orders/nonexistent-order-id')
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(4000);
    });
  });

  describe('POST /api/orders/:id/pay - 支付订单', () => {
    let orderId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      orderId = createResponse.body.data.id;
    });

    it('应该成功支付订单', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          payment_method: 'wechat',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('支付成功');

      const detailResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`);
      expect(detailResponse.body.data.status).toBe('paid');
    });

    it('应该拒绝卖家支付订单', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          payment_method: 'wechat',
        });

      expect(response.status).toBe(403);
    });

    it('应该拒绝重复支付', async () => {
      await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      const response = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4001);
    });

    it('应该拒绝未授权支付', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .send({ payment_method: 'wechat' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/orders/:id/ship - 发货', () => {
    let orderId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      orderId = createResponse.body.data.id;

      await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });
    });

    it('应该成功发货', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('发货成功');

      const detailResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${seller.token}`);
      expect(detailResponse.body.data.status).toBe('shipping');
    });

    it('应该拒绝买家发货', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(403);
    });

    it('应该拒绝未支付订单发货', async () => {
      const newOrderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });

      const response = await request(app)
        .post(`/api/orders/${newOrderResponse.body.data.id}/ship`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4001);
    });
  });

  describe('POST /api/orders/:id/complete - 确认收货', () => {
    let orderId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      orderId = createResponse.body.data.id;

      await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      await request(app)
        .post(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${seller.token}`);
    });

    it('应该成功确认收货', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('确认收货成功');

      const detailResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`);
      expect(detailResponse.body.data.status).toBe('completed');
    });

    it('应该拒绝卖家确认收货', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(403);
    });

    it('应该拒绝未发货订单确认收货', async () => {
      const newOrderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });

      await request(app)
        .post(`/api/orders/${newOrderResponse.body.data.id}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      const response = await request(app)
        .post(`/api/orders/${newOrderResponse.body.data.id}/complete`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4001);
    });
  });

  describe('POST /api/orders/:id/cancel - 取消订单', () => {
    it('应该成功取消订单（买家）', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      const orderId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('取消成功');
    });

    it('应该成功取消订单（卖家）', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      const orderId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('应该拒绝第三方取消订单', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      const orderId = createResponse.body.data.id;

      const thirdParty = await createTestUser('third_party_cancel');
      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${thirdParty.token}`);

      expect(response.status).toBe(403);
    });

    it('应该拒绝取消已完成的订单', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      const orderId = createResponse.body.data.id;

      await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      await request(app)
        .post(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${seller.token}`);

      await request(app)
        .post(`/api/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${buyer.token}`);

      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4001);
    });
  });

  describe('POST /api/orders/:id/review - 评价订单', () => {
    let completedOrderId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      completedOrderId = createResponse.body.data.id;

      await request(app)
        .post(`/api/orders/${completedOrderId}/pay`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ payment_method: 'wechat' });

      await request(app)
        .post(`/api/orders/${completedOrderId}/ship`)
        .set('Authorization', `Bearer ${seller.token}`);

      await request(app)
        .post(`/api/orders/${completedOrderId}/complete`)
        .set('Authorization', `Bearer ${buyer.token}`);
    });

    it('应该成功评价订单（买家评价卖家）', async () => {
      const response = await request(app)
        .post(`/api/orders/${completedOrderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 5,
          content: '卖家很靠谱，物品质量很好！',
          is_anonymous: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('评价成功');
    });

    it('应该拒绝重复评价', async () => {
      await request(app)
        .post(`/api/orders/${completedOrderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 5,
          content: '第一次评价',
        });

      const response = await request(app)
        .post(`/api/orders/${completedOrderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 4,
          content: '第二次评价',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4003);
    });

    it('应该拒绝评价未完成的订单', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: testItemId,
          delivery_method: 'face_to_face',
        });
      const pendingOrderId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/orders/${pendingOrderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 5,
          content: '测试评价',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(4001);
    });

    it('应该拒绝无效的评分', async () => {
      const response = await request(app)
        .post(`/api/orders/${completedOrderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 6,
          content: '评分超出范围',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders/buyer - 获取买家订单列表', () => {
    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${buyer.token}`)
          .send({
            item_id: testItemId,
            delivery_method: 'face_to_face',
          });
      }
    });

    it('应该成功获取买家订单列表', async () => {
      const response = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('应该支持按状态筛选', async () => {
      const response = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${buyer.token}`)
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      response.body.data.list.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${buyer.token}`)
        .query({ page: 1, page_size: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeLessThanOrEqual(2);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/orders/buyer');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/orders/seller - 获取卖家订单列表', () => {
    it('应该成功获取卖家订单列表', async () => {
      const response = await request(app)
        .get('/api/orders/seller')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/orders/seller');

      expect(response.status).toBe(401);
    });
  });
});
