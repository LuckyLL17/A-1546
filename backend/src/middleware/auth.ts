/**
 * 认证中间件模块
 * 用于验证用户的JWT Token，确保只有已登录用户才能访问受保护的接口
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { unauthorized } from '../utils/response';
import { JWTPayload } from '../types';
import logger from '../utils/logger';

/**
 * 认证中间件
 * 验证请求头中的JWT Token
 * 如果Token有效，将用户信息附加到request.user
 * 如果Token无效或过期，返回401错误
 *
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - 下一个中间件函数
 *
 * @example
 * // 在路由中使用
 * router.get('/profile', authMiddleware, getUserProfile);
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // 从请求头获取Authorization字段
    const authHeader = req.headers.authorization;

    // 检查Authorization头是否存在
    if (!authHeader) {
      unauthorized(res, '请先登录');
      return;
    }

    // 检查Token格式：应该是 "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      unauthorized(res, 'Token格式错误');
      return;
    }

    const token = parts[1];

    // 验证Token
    try {
      // 使用JWT密钥验证Token，并解析出用户信息
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

      // 将用户信息附加到请求对象，供后续处理使用
      req.user = decoded;

      // 调用下一个中间件或路由处理器
      next();
    } catch (jwtError) {
      // Token验证失败（可能是过期或被篡改）
      if (jwtError instanceof jwt.TokenExpiredError) {
        unauthorized(res, 'Token已过期，请重新登录');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        unauthorized(res, 'Token无效');
      } else {
        unauthorized(res, '身份验证失败');
      }
    }
  } catch (error) {
    // 捕获其他未知错误
    logger.error('认证中间件错误', { error: String(error) });
    unauthorized(res, '身份验证过程出错');
  }
};

/**
 * 可选认证中间件
 * 与authMiddleware类似，但不强制要求登录
 * 如果提供了有效Token，会解析用户信息
 * 如果没有Token或Token无效，也会继续处理请求（req.user为undefined）
 *
 * 用于一些可选登录的接口，例如：已登录用户看到的内容略有不同
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    // 如果没有Authorization头，直接继续
    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      req.user = decoded;
    } catch {
      // Token验证失败，但不阻止请求继续
      // 只是不设置req.user
    }

    next();
  } catch {
    // 出错也继续处理请求
    next();
  }
};

/**
 * 生成JWT Token
 *
 * @param payload - Token负载，包含用户ID和用户名
 * @returns 返回生成的JWT Token字符串
 *
 * @example
 * const token = generateToken({ userId: '123', username: 'test' });
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const options: jwt.SignOptions = {
    expiresIn: config.jwt.expiresIn as unknown as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload as object, config.jwt.secret, options);
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  generateToken,
};
