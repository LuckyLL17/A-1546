/**
 * 用户控制器模块
 * 处理用户相关的HTTP请求，调用服务层方法并返回响应
 */

import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { success, error } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  isValidUsername,
  isValidPassword,
  isValidEmail,
  isValidPhone,
  isEmpty,
} from '../utils/validator';

/**
 * 用户注册
 * POST /api/users/register
 * 
 * @param req - 请求对象，body包含 { username, password, email, phone? }
 * @param res - 响应对象
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, phone } = req.body;
  
  // 参数验证
  if (isEmpty(username)) {
    error(res, '用户名不能为空');
    return;
  }
  
  if (!isValidUsername(username)) {
    error(res, '用户名格式不正确，应为3-20个字符，字母开头，只能包含字母、数字、下划线');
    return;
  }
  
  if (isEmpty(password)) {
    error(res, '密码不能为空');
    return;
  }
  
  if (!isValidPassword(password)) {
    error(res, '密码格式不正确，应为6-20个字符，必须包含字母和数字');
    return;
  }
  
  if (isEmpty(email)) {
    error(res, '邮箱不能为空');
    return;
  }
  
  if (!isValidEmail(email)) {
    error(res, '邮箱格式不正确');
    return;
  }
  
  if (phone && !isValidPhone(phone)) {
    error(res, '手机号格式不正确');
    return;
  }
  
  // 调用服务层进行注册
  const result = await userService.register({ username, password, email, phone });
  
  success(res, result, '注册成功');
});

/**
 * 用户登录
 * POST /api/users/login
 * 
 * @param req - 请求对象，body包含 { username, password }
 * @param res - 响应对象
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  
  // 参数验证
  if (isEmpty(username)) {
    error(res, '用户名不能为空');
    return;
  }
  
  if (isEmpty(password)) {
    error(res, '密码不能为空');
    return;
  }
  
  // 调用服务层进行登录
  const result = await userService.login({ username, password });
  
  success(res, result, '登录成功');
});

/**
 * 获取当前登录用户信息
 * GET /api/users/profile
 * 需要登录（authMiddleware）
 * 
 * @param req - 请求对象，user由认证中间件设置
 * @param res - 响应对象
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // 从认证中间件获取用户ID
  const userId = req.user!.userId;
  
  // 获取用户信息
  const user = await userService.getUserById(userId);
  
  success(res, user, '获取成功');
});

/**
 * 获取其他用户的公开信息
 * GET /api/users/:id
 * 
 * @param req - 请求对象，params包含用户ID
 * @param res - 响应对象
 */
export const getUserPublicInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  if (isEmpty(id)) {
    error(res, '用户ID不能为空');
    return;
  }
  
  const user = await userService.getUserPublicInfo(id);
  
  success(res, user, '获取成功');
});

/**
 * 更新用户信息
 * PUT /api/users/profile
 * 需要登录
 * 
 * @param req - 请求对象，body包含更新的字段
 * @param res - 响应对象
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { real_name, phone, avatar, school, campus, dormitory, student_id } = req.body;
  
  // 验证手机号格式（如果提供）
  if (phone && !isValidPhone(phone)) {
    error(res, '手机号格式不正确');
    return;
  }
  
  // 调用服务层更新用户信息
  const updatedUser = await userService.updateUser(userId, {
    real_name,
    phone,
    avatar,
    school,
    campus,
    dormitory,
    student_id,
  });
  
  success(res, updatedUser, '更新成功');
});

/**
 * 修改密码
 * PUT /api/users/password
 * 需要登录
 * 
 * @param req - 请求对象，body包含 { old_password, new_password }
 * @param res - 响应对象
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { old_password, new_password } = req.body;
  
  // 参数验证
  if (isEmpty(old_password)) {
    error(res, '原密码不能为空');
    return;
  }
  
  if (isEmpty(new_password)) {
    error(res, '新密码不能为空');
    return;
  }
  
  if (!isValidPassword(new_password)) {
    error(res, '新密码格式不正确，应为6-20个字符，必须包含字母和数字');
    return;
  }
  
  // 调用服务层修改密码
  await userService.changePassword(userId, old_password, new_password);
  
  success(res, null, '密码修改成功');
});

// 导出所有控制器方法
export default {
  register,
  login,
  getProfile,
  getUserPublicInfo,
  updateProfile,
  changePassword,
};