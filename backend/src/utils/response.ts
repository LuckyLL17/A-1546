/**
 * 统一响应处理模块
 * 定义API响应的标准格式，确保所有接口返回格式一致
 */

import { Response } from 'express';

/**
 * 标准响应数据接口
 * 所有API响应都遵循这个格式
 * 
 * @template T - 响应数据的类型
 */
export interface ApiResponse<T = any> {
  code: number;        // 状态码：0表示成功，其他表示失败
  message: string;     // 提示信息
  data?: T;            // 响应数据（可选）
  timestamp: number;   // 响应时间戳
}

/**
 * 分页数据接口
 * 用于返回分页列表的响应
 * 
 * @template T - 列表项的类型
 */
export interface PaginatedData<T> {
  list: T[];           // 数据列表
  total: number;       // 总记录数
  page: number;        // 当前页码
  pageSize: number;    // 每页数量
  totalPages: number;  // 总页数
}

/**
 * 发送成功响应
 * 
 * @param res - Express响应对象
 * @param data - 响应数据
 * @param message - 成功提示信息，默认为"操作成功"
 * 
 * @example
 * // 返回用户信息
 * success(res, { id: '123', username: 'test' }, '获取成功');
 */
export const success = <T>(
  res: Response,
  data?: T,
  message: string = '操作成功'
): void => {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  };
  res.json(response);
};

/**
 * 发送分页数据响应
 * 
 * @param res - Express响应对象
 * @param list - 数据列表
 * @param total - 总记录数
 * @param page - 当前页码
 * @param pageSize - 每页数量
 * @param message - 成功提示信息
 * 
 * @example
 * // 返回物品列表
 * paginated(res, items, 100, 1, 10, '获取成功');
 */
export const paginated = <T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = '获取成功'
): void => {
  const totalPages = Math.ceil(total / pageSize);
  const data: PaginatedData<T> = {
    list,
    total,
    page,
    pageSize,
    totalPages,
  };
  success(res, data, message);
};

/**
 * 发送错误响应
 * 
 * @param res - Express响应对象
 * @param message - 错误提示信息
 * @param code - 错误码，默认为-1
 * @param httpStatus - HTTP状态码，默认为400
 * 
 * @example
 * // 返回参数错误
 * error(res, '用户名不能为空', 1001, 400);
 */
export const error = (
  res: Response,
  message: string,
  code: number = -1,
  httpStatus: number = 400
): void => {
  const response: ApiResponse = {
    code,
    message,
    timestamp: Date.now(),
  };
  res.status(httpStatus).json(response);
};

/**
 * 发送未授权响应（401）
 * 用于用户未登录或Token无效的情况
 * 
 * @param res - Express响应对象
 * @param message - 错误提示信息，默认为"未授权，请先登录"
 */
export const unauthorized = (
  res: Response,
  message: string = '未授权，请先登录'
): void => {
  error(res, message, 401, 401);
};

/**
 * 发送禁止访问响应（403）
 * 用于用户没有权限访问资源的情况
 * 
 * @param res - Express响应对象
 * @param message - 错误提示信息，默认为"无权访问"
 */
export const forbidden = (
  res: Response,
  message: string = '无权访问'
): void => {
  error(res, message, 403, 403);
};

/**
 * 发送资源不存在响应（404）
 * 
 * @param res - Express响应对象
 * @param message - 错误提示信息，默认为"资源不存在"
 */
export const notFound = (
  res: Response,
  message: string = '资源不存在'
): void => {
  error(res, message, 404, 404);
};

/**
 * 发送服务器错误响应（500）
 * 
 * @param res - Express响应对象
 * @param message - 错误提示信息，默认为"服务器内部错误"
 */
export const serverError = (
  res: Response,
  message: string = '服务器内部错误'
): void => {
  error(res, message, 500, 500);
};

// 导出所有响应方法
export default {
  success,
  paginated,
  error,
  unauthorized,
  forbidden,
  notFound,
  serverError,
};
