import request from 'supertest';
import app from '../../src/app';
import { generateUniqueUsername, generateUniqueEmail } from '../helpers/testHelper';

describe('完整业务流程集成测试', () => {
  describe('用户注册 → 发布物品 → 下单购买 → 评价完整流程', () => {
    let seller: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let buyer: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let itemId: string;
    let orderId: string;
    let orderNo: string;

    beforeAll(() => {
      seller = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'seller123456',
      };
      buyer = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'buyer123456',
      };
    });

    test('步骤1: 卖家注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: seller.username,
          password: seller.password,
          email: seller.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      seller.token = response.body.data.token;
      seller.userId = response.body.data.user.id;

      expect(seller.token).toBeDefined();
      expect(seller.userId).toBeDefined();
    });

    test('步骤2: 买家注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: buyer.username,
          password: buyer.password,
          email: buyer.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      buyer.token = response.body.data.token;
      buyer.userId = response.body.data.user.id;

      expect(buyer.token).toBeDefined();
      expect(buyer.userId).toBeDefined();
    });

    test('步骤3: 卖家完善个人信息', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          real_name: '测试卖家',
          phone: '13900139000',
          school: '测试大学',
          campus: '主校区',
          dormitory: '1号楼101',
          student_id: '2021001001',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新成功');

      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(profileResponse.body.data.real_name).toBe('测试卖家');
      expect(profileResponse.body.data.school).toBe('测试大学');
    });

    test('步骤4: 卖家创建物品', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '二手 MacBook Pro 2023',
          description: 'M2芯片，16G内存，512G存储，成色95新，无划痕',
          price: 8999,
          original_price: 14999,
          category_id: 2,
          condition_level: 'like_new',
          location: '测试大学主校区',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建成功');
      itemId = response.body.data.id;

      expect(itemId).toBeDefined();
    });

    test('步骤5: 卖家发布物品', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('发布成功');
    });

    test('步骤6: 买家浏览物品列表', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({
          keyword: 'MacBook',
          page: 1,
          page_size: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
    });

    test('步骤7: 买家查看物品详情', async () => {
      const response = await request(app)
        .get(`/api/items/${itemId}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(itemId);
      expect(response.body.data.title).toBe('二手 MacBook Pro 2023');
      expect(response.body.data.price).toBe(8999);
      expect(response.body.data.seller).toBeDefined();
      expect(response.body.data.seller.id).toBe(seller.userId);
      expect(response.body.data.view_count).toBeGreaterThanOrEqual(1);
    });

    test('步骤8: 买家收藏物品', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('收藏成功');
    });

    test('步骤9: 买家查看收藏列表', async () => {
      const response = await request(app)
        .get('/api/items/my/favorites')
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.list[0].id).toBe(itemId);
    });

    test('步骤10: 买家创建订单', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          item_id: itemId,
          delivery_method: 'face_to_face',
          remark: '明天下午3点在图书馆门口交易可以吗？',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('下单成功');
      orderId = response.body.data.id;
      orderNo = response.body.data.order_no;

      expect(orderId).toBeDefined();
      expect(orderNo).toBeDefined();
      expect(response.body.data.seller_id).toBe(seller.userId);
      expect(response.body.data.buyer_id).toBe(buyer.userId);
      expect(response.body.data.price).toBe(8999);
      expect(response.body.data.status).toBe('pending');
    });

    test('步骤11: 买家查看订单详情', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data.item).toBeDefined();
      expect(response.body.data.item.title).toBe('二手 MacBook Pro 2023');
    });

    test('步骤12: 买家查看订单列表', async () => {
      const response = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
    });

    test('步骤13: 卖家查看订单列表', async () => {
      const response = await request(app)
        .get('/api/orders/seller')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.list[0].id).toBe(orderId);
    });

    test('步骤14: 买家支付订单', async () => {
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

    test('步骤15: 卖家发货', async () => {
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

    test('步骤16: 买家确认收货', async () => {
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

    test('步骤17: 验证物品状态已变为已售出', async () => {
      const response = await request(app)
        .get(`/api/items/${itemId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('sold');
    });

    test('步骤18: 验证卖家信用分增加', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.credit_score).toBeGreaterThanOrEqual(105);
    });

    test('步骤19: 买家评价订单', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/review`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          rating: 5,
          content: '卖家很靠谱，物品和描述一致，交易很顺利！',
          is_anonymous: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('评价成功');
    });

    test('步骤20: 查看卖家评价列表', async () => {
      const response = await request(app)
        .get(`/api/users/${seller.userId}/reviews`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].rating).toBe(5);
    });

    test('步骤21: 卖家查看我的物品列表（已售出）', async () => {
      const response = await request(app)
        .get('/api/items/my/list')
        .set('Authorization', `Bearer ${seller.token}`)
        .query({ status: 'sold' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.list[0].id).toBe(itemId);
      expect(response.body.data.list[0].status).toBe('sold');
    });
  });

  describe('用户注册 → 发布资源 → 下载资源流程', () => {
    let uploader: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let downloader: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let resourceId: string;

    beforeAll(() => {
      uploader = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'uploader123',
      };
      downloader = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'downloader123',
      };
    });

    test('步骤1: 上传者注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: uploader.username,
          password: uploader.password,
          email: uploader.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      uploader.token = response.body.data.token;
      uploader.userId = response.body.data.user.id;
    });

    test('步骤2: 下载者注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: downloader.username,
          password: downloader.password,
          email: downloader.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      downloader.token = response.body.data.token;
      downloader.userId = response.body.data.user.id;
    });

    test('步骤3: 上传者创建资源', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${uploader.token}`)
        .send({
          title: '高等数学期末复习资料',
          description: '包含历年真题和详细解析，适合期末复习使用',
          resource_type: 'document',
          file_url: 'https://example.com/math-review.pdf',
          file_size: 2048000,
          tags: ['高数', '期末', '复习'],
          is_free: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      resourceId = response.body.data.id;
      expect(resourceId).toBeDefined();
    });

    test('步骤4: 上传者发布资源', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceId}/publish`)
        .set('Authorization', `Bearer ${uploader.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('发布成功');
    });

    test('步骤5: 下载者搜索资源', async () => {
      const response = await request(app)
        .get('/api/resources')
        .query({
          keyword: '高数',
          resource_type: 'document',
          is_free: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
    });

    test('步骤6: 下载者查看资源详情', async () => {
      const response = await request(app)
        .get(`/api/resources/${resourceId}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(resourceId);
      expect(response.body.data.title).toBe('高等数学期末复习资料');
      expect(response.body.data.uploader).toBeDefined();
      expect(response.body.data.uploader.id).toBe(uploader.userId);
    });

    test('步骤7: 下载者下载资源', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceId}/download`)
        .set('Authorization', `Bearer ${downloader.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.file_url).toBeDefined();
    });

    test('步骤8: 验证下载次数增加', async () => {
      const response = await request(app)
        .get(`/api/resources/${resourceId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.download_count).toBeGreaterThanOrEqual(1);
    });

    test('步骤9: 下载者查看我的下载记录', async () => {
      const response = await request(app)
        .get('/api/resources/my/downloads')
        .set('Authorization', `Bearer ${downloader.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('用户注册 → 发送消息 → 聊天流程', () => {
    let user1: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let user2: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let seller: {
      username: string;
      email: string;
      password: string;
      token?: string;
      userId?: string;
    };
    let itemId: string;
    let sessionId: string;

    beforeAll(() => {
      user1 = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'user1pass',
      };
      user2 = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'user2pass',
      };
      seller = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'sellerpass',
      };
    });

    test('步骤1: 用户1注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: user1.username,
          password: user1.password,
          email: user1.email,
        });
      user1.token = response.body.data.token;
      user1.userId = response.body.data.user.id;
    });

    test('步骤2: 用户2注册', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: user2.username,
          password: user2.password,
          email: user2.email,
        });
      user2.token = response.body.data.token;
      user2.userId = response.body.data.user.id;
    });

    test('步骤3: 卖家注册并发布物品', async () => {
      const sellerResponse = await request(app)
        .post('/api/users/register')
        .send({
          username: seller.username,
          password: seller.password,
          email: seller.email,
        });
      seller.token = sellerResponse.body.data.token;
      seller.userId = sellerResponse.body.data.user.id;

      const itemResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '聊天测试物品',
          price: 100,
          description: '用于测试聊天功能的物品',
        });
      itemId = itemResponse.body.data.id;

      await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);
    });

    test('步骤4: 用户1给卖家发送消息（新会话）', async () => {
      const response = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          receiver_id: seller.userId,
          item_id: itemId,
          content: '你好，请问这个物品还在吗？',
          message_type: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('发送成功');
      expect(response.body.data.session_id).toBeDefined();
      sessionId = response.body.data.session_id;
    });

    test('步骤5: 用户1获取会话列表', async () => {
      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].id).toBe(sessionId);
    });

    test('步骤6: 卖家获取会话列表', async () => {
      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('步骤7: 卖家回复消息', async () => {
      const response = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          session_id: sessionId,
          content: '在的，物品还在，有什么问题吗？',
          message_type: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    test('步骤8: 用户1获取会话消息', async () => {
      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBe(2);
    });

    test('步骤9: 用户1获取未读消息数', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.count).toBeGreaterThanOrEqual(0);
    });

    test('步骤10: 用户1标记会话已读', async () => {
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/read`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('标记已读成功');
    });
  });
});
