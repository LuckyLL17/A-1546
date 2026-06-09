import request from 'supertest';
import app from '../../src/app';

describe('健康检查接口测试', () => {
  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });

    it('响应应该包含有效的ISO时间戳', async () => {
      const response = await request(app).get('/health');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('404处理', () => {
    it('访问不存在的路由应该返回404', async () => {
      const response = await request(app).get('/api/nonexistent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', 404);
      expect(response.body).toHaveProperty('message', '接口不存在');
    });
  });
});
