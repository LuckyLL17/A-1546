/**
 * 用户服务模块
 * 处理用户相关的业务逻辑，包括注册、登录、信息管理等
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query, execute } from '../utils/database';
import { generateToken } from '../middleware/auth';
import { AppError, ErrorCode } from '../utils/errors';
import logger from '../utils/logger';
import {
  User,
  RegisterParams,
  LoginParams,
  UpdateUserParams,
  UserPublicInfo,
} from '../types';

/**
 * 用户注册
 * 创建新用户账户
 * 
 * @param params - 注册参数，包含用户名、密码、邮箱等
 * @returns 返回新用户的ID和Token
 * @throws 如果用户名或邮箱已存在，抛出错误
 * 
 * @example
 * const result = await register({
 *   username: 'newuser',
 *   password: 'password123',
 *   email: 'user@example.com'
 * });
 */
export const register = async (
  params: RegisterParams
): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { username, password, email, phone } = params;
  
  // 检查用户名是否已存在
  const existingUsername = await query<User>(
    'SELECT id FROM users WHERE username = ?',
    [username]
  );
  if (existingUsername.length > 0) {
    throw AppError.badRequest('用户名已被使用', ErrorCode.USERNAME_EXISTS);
  }
  
  // 检查邮箱是否已存在
  const existingEmail = await query<User>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingEmail.length > 0) {
    throw AppError.badRequest('邮箱已被注册', ErrorCode.EMAIL_EXISTS);
  }
  
  // 生成用户ID（UUID）
  const userId = uuidv4();
  
  // 加密密码
  // bcrypt.hash的第二个参数是盐的复杂度，10是推荐值
  // 盐是一个随机字符串，用于防止彩虹表攻击
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 插入新用户记录
  await execute(
    `INSERT INTO users (id, username, password, email, phone) 
     VALUES (?, ?, ?, ?, ?)`,
    [userId, username, hashedPassword, email, phone || null]
  );
  
  // 查询完整用户信息
  const users = await query<User>(
    'SELECT id, username, email, phone, real_name, student_id, avatar, school, campus, dormitory, credit_score, status, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );
  const user = users[0];
  
  // 生成登录Token
  const token = generateToken({ userId, username });
  
  logger.info('用户注册成功', { userId, username, email });

  return { user, token };
};

/**
 * 用户登录
 * 验证用户身份并返回Token
 * 
 * @param params - 登录参数，包含用户名（或邮箱）和密码
 * @returns 返回用户信息和Token
 * @throws 如果用户不存在或密码错误，抛出错误
 */
export const login = async (
  params: LoginParams
): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { username, password } = params;
  
  // 根据用户名或邮箱查询用户
  // 允许用户使用用户名或邮箱登录
  const users = await query<User>(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username]
  );
  
  // 检查用户是否存在
  if (users.length === 0) {
    throw AppError.badRequest('用户名或密码错误', ErrorCode.PASSWORD_WRONG);
  }
  
  const user = users[0];
  
  // 检查账户状态
  if (user.status === 'banned') {
    throw AppError.forbidden('账户已被禁用', ErrorCode.ACCOUNT_DISABLED);
  }
  
  if (user.status === 'inactive') {
    throw AppError.badRequest('账户未激活', ErrorCode.ACCOUNT_INACTIVE);
  }
  
  // 验证密码
  // bcrypt.compare会自动处理盐的对比
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw AppError.badRequest('用户名或密码错误', ErrorCode.PASSWORD_WRONG);
  }
  
  // 生成Token
  const token = generateToken({ userId: user.id, username: user.username });
  
  // 返回用户信息（排除密码字段）
  const { password: _, ...userWithoutPassword } = user;
  
  logger.info('用户登录成功', { userId: user.id, username: user.username });

  return { user: userWithoutPassword, token };
};

/**
 * 根据ID获取用户信息
 * 
 * @param userId - 用户ID
 * @returns 返回用户信息（不包含密码）
 * @throws 如果用户不存在，抛出错误
 */
export const getUserById = async (
  userId: string
): Promise<Omit<User, 'password'>> => {
  const users = await query<User>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw AppError.notFound('用户不存在', ErrorCode.USER_NOT_FOUND);
  }
  
  const { password: _, ...userWithoutPassword } = users[0];
  return userWithoutPassword;
};

/**
 * 获取用户公开信息
 * 用于展示给其他用户看的信息，不包含敏感数据
 * 
 * @param userId - 用户ID
 * @returns 返回用户公开信息
 */
export const getUserPublicInfo = async (
  userId: string
): Promise<UserPublicInfo> => {
  const users = await query<User>(
    'SELECT id, username, avatar, school, credit_score, created_at FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw AppError.notFound('用户不存在', ErrorCode.USER_NOT_FOUND);
  }
  
  return users[0] as unknown as UserPublicInfo;
};

/**
 * 更新用户信息
 * 
 * @param userId - 用户ID
 * @param params - 更新参数
 * @returns 返回更新后的用户信息
 */
export const updateUser = async (
  userId: string,
  params: UpdateUserParams
): Promise<Omit<User, 'password'>> => {
  // 构建更新SQL
  // 只更新传入的字段
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  // 遍历参数对象，构建更新语句
  if (params.real_name !== undefined) {
    updateFields.push('real_name = ?');
    updateValues.push(params.real_name);
  }
  if (params.phone !== undefined) {
    updateFields.push('phone = ?');
    updateValues.push(params.phone);
  }
  if (params.avatar !== undefined) {
    updateFields.push('avatar = ?');
    updateValues.push(params.avatar);
  }
  if (params.school !== undefined) {
    updateFields.push('school = ?');
    updateValues.push(params.school);
  }
  if (params.campus !== undefined) {
    updateFields.push('campus = ?');
    updateValues.push(params.campus);
  }
  if (params.dormitory !== undefined) {
    updateFields.push('dormitory = ?');
    updateValues.push(params.dormitory);
  }
  if (params.student_id !== undefined) {
    updateFields.push('student_id = ?');
    updateValues.push(params.student_id);
  }
  
  // 如果没有需要更新的字段
  if (updateFields.length === 0) {
    return getUserById(userId);
  }
  
  // 添加用户ID作为WHERE条件的参数
  updateValues.push(userId);
  
  // 执行更新
  await execute(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );
  
  // 返回更新后的用户信息
  return getUserById(userId);
};

/**
 * 修改密码
 * 
 * @param userId - 用户ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 * @throws 如果旧密码错误，抛出错误
 */
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  // 获取当前用户信息（包含密码）
  const users = await query<User>(
    'SELECT password FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw AppError.notFound('用户不存在', ErrorCode.USER_NOT_FOUND);
  }
  
  // 验证旧密码
  const isOldPasswordValid = await bcrypt.compare(oldPassword, users[0].password);
  if (!isOldPasswordValid) {
    throw AppError.badRequest('原密码错误', ErrorCode.PASSWORD_WRONG);
  }
  
  // 加密新密码
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
  // 更新密码
  await execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedNewPassword, userId]
  );
  
  logger.info('用户修改密码', { userId });
};

/**
 * 更新用户信用分
 * 信用分用于评估用户的可信度
 * 
 * @param userId - 用户ID
 * @param delta - 变化值，正数增加，负数减少
 */
export const updateCreditScore = async (
  userId: string,
  delta: number
): Promise<void> => {
  await execute(
    'UPDATE users SET credit_score = GREATEST(0, credit_score + ?) WHERE id = ?',
    [delta, userId]
  );
};

/**
 * 检查用户是否存在
 * 
 * @param userId - 用户ID
 * @returns 返回布尔值
 */
export const userExists = async (userId: string): Promise<boolean> => {
  const users = await query<User>(
    'SELECT id FROM users WHERE id = ?',
    [userId]
  );
  return users.length > 0;
};

// 导出所有服务方法
export default {
  register,
  login,
  getUserById,
  getUserPublicInfo,
  updateUser,
  changePassword,
  updateCreditScore,
  userExists,
};
