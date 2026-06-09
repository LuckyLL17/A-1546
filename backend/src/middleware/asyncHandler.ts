/**
 * 异步请求处理包装器
 * 统一捕获 controller 中的异步错误，消除重复的 try-catch 代码
 * 
 * - AppError：根据错误码和 HTTP 状态码返回结构化错误响应
 * - 其他 Error：返回 500 服务器内部错误
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { error as errorResponse, serverError } from '../utils/response';
import logger from '../utils/logger';

/**
 * 包装异步 controller 方法，自动捕获错误并返回统一格式的响应
 *
 * @param fn - 异步 controller 处理函数
 * @returns 包装后的 Express 中间件
 *
 * @example
 * // 改造前
 * export const getUser = async (req: Request, res: Response) => {
 *   try {
 *     const user = await userService.getUserById(req.params.id);
 *     success(res, user);
 *   } catch (err) {
 *     if (err instanceof AppError) {
 *       error(res, err.message, err.errorCode, err.httpStatus);
 *     } else {
 *       serverError(res);
 *     }
 *   }
 * };
 *
 * // 改造后
 * export const getUser = asyncHandler(async (req: Request, res: Response) => {
 *   const user = await userService.getUserById(req.params.id);
 *   success(res, user);
 * });
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch((err: unknown) => {
      if (err instanceof AppError) {
        logger.warn('业务错误', {
          errorCode: err.errorCode,
          httpStatus: err.httpStatus,
          message: err.message,
          method: req.method,
          url: req.originalUrl,
        });
        errorResponse(res, err.message, err.errorCode, err.httpStatus);
      } else {
        logger.error('未捕获的控制器错误', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          method: req.method,
          url: req.originalUrl,
        });
        serverError(res);
      }
    });
  };
};

export default asyncHandler;
