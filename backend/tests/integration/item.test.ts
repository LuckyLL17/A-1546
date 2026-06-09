import request from 'supertest';
import app from '../../src/app';
import { createTestUser, generateUniqueUsername, generateUniqueEmail } from '../helpers/testHelper';

describe('物品模块 API 测试', () => {
  let seller: { id: string; token: string; username: string };
  let buyer: { id: string; token: string; username: string };

  beforeAll(async () => {
    const sellerUser = await createTestUser('seller');
    seller = { id: sellerUser.id, token: sellerUser.token, username: sellerUser.username };
    
    const buyerUser = await createTestUser('buyer');
    buyer = { id: buyerUser.id, token: buyerUser.token, username: buyerUser.username };
  });

  describe('POST /api/items - 创建物品', () => {
    it('应该成功创建物品', async () => {
      const itemData = {
        title: '测试物品 - 二手书籍',
        price: 29.99,
        description: '这是一本测试用的二手书籍',
        category_id: 2,
        condition_level: 'good',
        location: '测试大学图书馆',
      };

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send(itemData);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建成功');
      expect(response.body.data.id).toBeDefined();
    });

    it('应该拒绝未授权创建物品', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          title: '测试物品',
          price: 99.99,
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝缺少必填参数的创建', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          description: '只有描述，没有标题和价格',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/items/:id/publish - 发布物品', () => {
    let itemId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: `待发布物品_${Date.now()}`,
          price: 50,
          description: '待发布的测试物品',
        });
      itemId = createResponse.body.data.id;
    });

    it('应该成功发布物品', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('发布成功');
    });

    it('应该拒绝非所有者发布物品', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/items/:id - 获取物品详情', () => {
    let publishedItemId: string;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '测试物品详情',
          price: 100,
          description: '用于测试详情接口的物品',
          category_id: 1,
          condition_level: 'like_new',
        });
      publishedItemId = createResponse.body.data.id;

      await request(app)
        .post(`/api/items/${publishedItemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);
    });

    it('应该成功获取物品详情（未登录）', async () => {
      const response = await request(app)
        .get(`/api/items/${publishedItemId}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(publishedItemId);
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.price).toBeDefined();
      expect(response.body.data.seller).toBeDefined();
      expect(response.body.data.view_count).toBeGreaterThanOrEqual(1);
    });

    it('应该成功获取物品详情（已登录）', async () => {
      const response = await request(app)
        .get(`/api/items/${publishedItemId}`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.is_favorited).toBeDefined();
    });

    it('应该返回404对于不存在的物品', async () => {
      const response = await request(app)
        .get('/api/items/nonexistent-item-id');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(3000);
    });
  });

  describe('GET /api/items - 搜索物品列表', () => {
    beforeAll(async () => {
      for (let i = 0; i < 5; i++) {
        const createResponse = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${seller.token}`)
          .send({
            title: `搜索测试物品_${i}_${Date.now()}`,
            price: 50 + i * 10,
            description: `这是第${i}个搜索测试物品`,
            category_id: 1,
          });
        await request(app)
          .post(`/api/items/${createResponse.body.data.id}/publish`)
          .set('Authorization', `Bearer ${seller.token}`);
      }
    });

    it('应该成功获取物品列表', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(5);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
    });

    it('应该支持关键词搜索', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ keyword: '搜索测试', page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list.length).toBeGreaterThanOrEqual(5);
    });

    it('应该支持价格范围筛选', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ min_price: 60, max_price: 90, page: 1, page_size: 10 });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      response.body.data.list.forEach((item: any) => {
        expect(item.price).toBeGreaterThanOrEqual(60);
        expect(item.price).toBeLessThanOrEqual(90);
      });
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ page: 1, page_size: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeLessThanOrEqual(2);
      expect(response.body.data.totalPages).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PUT /api/items/:id - 更新物品', () => {
    let itemId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '待更新物品',
          price: 100,
          description: '原始描述',
        });
      itemId = createResponse.body.data.id;
    });

    it('应该成功更新物品信息', async () => {
      const updateData = {
        title: '更新后的标题',
        price: 150,
        description: '更新后的描述',
      };

      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新成功');

      const detailResponse = await request(app)
        .get(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(detailResponse.body.data.title).toBe(updateData.title);
      expect(detailResponse.body.data.price).toBe(updateData.price);
      expect(detailResponse.body.data.description).toBe(updateData.description);
    });

    it('应该拒绝非所有者更新物品', async () => {
      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ title: '非法更新' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/items/:id/favorite - 收藏物品', () => {
    let itemId: string;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '收藏测试物品',
          price: 88,
          description: '用于测试收藏功能的物品',
        });
      itemId = createResponse.body.data.id;
      await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);
    });

    it('应该成功收藏物品', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('收藏成功');
    });

    it('应该拒绝重复收藏', async () => {
      await request(app)
        .post(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);

      const response = await request(app)
        .post(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(3006);
    });

    it('应该拒绝未授权收藏', async () => {
      const response = await request(app)
        .post(`/api/items/${itemId}/favorite`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/items/:id/favorite - 取消收藏', () => {
    let itemId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: `取消收藏测试_${Date.now()}`,
          price: 66,
        });
      itemId = createResponse.body.data.id;
      await request(app)
        .post(`/api/items/${itemId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`);
      await request(app)
        .post(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);
    });

    it('应该成功取消收藏', async () => {
      const response = await request(app)
        .delete(`/api/items/${itemId}/favorite`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('取消收藏成功');
    });
  });

  describe('GET /api/items/my/list - 获取我的物品列表', () => {
    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${seller.token}`)
          .send({
            title: `我的物品_${i}_${Date.now()}`,
            price: 100 + i * 10,
          });
        if (i % 2 === 0) {
          await request(app)
            .post(`/api/items/${createResponse.body.data.id}/publish`)
            .set('Authorization', `Bearer ${seller.token}`);
        }
      }
    });

    it('应该成功获取我的物品列表', async () => {
      const response = await request(app)
        .get('/api/items/my/list')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('应该支持按状态筛选', async () => {
      const response = await request(app)
        .get('/api/items/my/list')
        .set('Authorization', `Bearer ${seller.token}`)
        .query({ status: 'published' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      response.body.data.list.forEach((item: any) => {
        expect(item.status).toBe('published');
      });
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/items/my/list');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/items/my/favorites - 获取我的收藏列表', () => {
    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${seller.token}`)
          .send({
            title: `收藏物品_${i}_${Date.now()}`,
            price: 50 + i * 20,
          });
        await request(app)
          .post(`/api/items/${createResponse.body.data.id}/publish`)
          .set('Authorization', `Bearer ${seller.token}`);
        await request(app)
          .post(`/api/items/${createResponse.body.data.id}/favorite`)
          .set('Authorization', `Bearer ${buyer.token}`);
      }
    });

    it('应该成功获取我的收藏列表', async () => {
      const response = await request(app)
        .get('/api/items/my/favorites')
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('应该拒绝未授权访问', async () => {
      const response = await request(app)
        .get('/api/items/my/favorites');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/categories - 获取分类列表', () => {
    it('应该成功获取分类列表', async () => {
      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('应该包含子分类', async () => {
      const response = await request(app)
        .get('/api/categories');

      const parentCategory = response.body.data.find((cat: any) => cat.children && cat.children.length > 0);
      expect(parentCategory).toBeDefined();
      expect(parentCategory.children).toBeInstanceOf(Array);
      expect(parentCategory.children.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/items/:id - 删除物品', () => {
    let itemId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          title: '待删除物品',
          price: 99,
        });
      itemId = createResponse.body.data.id;
    });

    it('应该成功删除物品', async () => {
      const response = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('删除成功');

      const detailResponse = await request(app)
        .get(`/api/items/${itemId}`);

      expect(detailResponse.status).toBe(404);
    });

    it('应该拒绝非所有者删除物品', async () => {
      const response = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${buyer.token}`);

      expect(response.status).toBe(403);
    });
  });
});
