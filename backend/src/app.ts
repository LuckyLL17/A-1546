/**
 * 应用入口文件
 * 校园二手物品交易与资源共享平台 - 后端服务
 * 
 * 本文件负责：
 * 1. 初始化Express应用
 * 2. 配置中间件
 * 3. 注册路由
 * 4. 启动服务器
 * 5. 连接数据库
 */

import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
import routes from './routes';
import { initDatabase, closeDatabase } from './utils/database';
import { serverError, error as errorResponse } from './utils/response';
import { AppError } from './utils/errors';
import logger from './utils/logger';

// 创建Express应用实例
const app: Express = express();

// =====================================================
// 中间件配置
// =====================================================

/**
 * CORS中间件
 * 允许跨域请求，便于前端调用
 */
app.use(cors({
  origin: '*',                    // 允许所有来源（生产环境应限制为特定域名）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * JSON解析中间件
 * 解析请求体中的JSON数据
 */
app.use(express.json({ limit: '10mb' }));

/**
 * URL编码解析中间件
 * 解析URL编码的请求体
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 设置响应头中间件
 * 确保所有响应使用正确的UTF-8编码
 */
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

/**
 * 请求日志中间件
 * 记录每个请求的方法、路径、响应状态码和耗时
 * 所有环境均生效
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 响应结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.userId;

    logger.request({
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress,
      userId,
    });
  });

  next();
});

// =====================================================
// 路由配置
// =====================================================

/**
 * 健康检查接口
 * 用于检测服务是否正常运行
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * API路由
 * 所有业务接口都挂载在 /api 路径下
 */
app.use('/api', routes);

/**
 * 404处理
 * 处理未匹配的路由
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    timestamp: Date.now(),
  });
});

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，返回统一格式的错误响应
 * 支持 AppError 结构化错误，自动映射 HTTP 状态码和业务错误码
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    // 结构化业务错误：使用 AppError 携带的状态码和错误码
    logger.warn('业务错误', {
      errorCode: err.errorCode,
      httpStatus: err.httpStatus,
      message: err.message,
    });
    errorResponse(res, err.message, err.errorCode, err.httpStatus);
  } else {
    // 未知错误：记录完整错误栈，生产环境隐藏详细信息
    logger.error('服务器未捕获错误', {
      message: err.message,
      stack: err.stack,
    });
    serverError(res, config.server.env === 'development' ? err.message : '服务器内部错误');
  }
});

// =====================================================
// 服务器启动
// =====================================================

/**
 * 启动服务器
 */
const startServer = async (): Promise<void> => {
  try {
    // 初始化数据库连接
    logger.info('正在连接数据库...');
    initDatabase();
    logger.info('数据库连接成功');
    
    // 启动HTTP服务器
    const server = app.listen(config.server.port, () => {
      logger.info('服务器启动成功', {
        env: config.server.env,
        port: config.server.port,
        url: `http://localhost:${config.server.port}`,
        apiBase: `http://localhost:${config.server.port}/api`,
        health: `http://localhost:${config.server.port}/health`,
      });
    });
    
    // 优雅关闭
    // 当收到终止信号时，先关闭HTTP服务器，再关闭数据库连接
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(async () => {
        logger.info('HTTP服务器已关闭');
        
        try {
          await closeDatabase();
          logger.info('数据库连接已关闭');
          process.exit(0);
        } catch (error) {
          logger.error('关闭数据库连接时出错', { error: String(error) });
          process.exit(1);
        }
      });
      
      // 如果10秒内没有关闭完成，强制退出
      setTimeout(() => {
        logger.error('关闭超时，强制退出');
        process.exit(1);
      }, 10000);
    };
    
    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('启动服务器失败', { error: String(error) });
    process.exit(1);
  }
};

// 启动服务器
startServer();

// 导出app实例（用于测试）
export default app;
