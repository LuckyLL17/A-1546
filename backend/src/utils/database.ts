/**
 * 数据库连接模块
 * 负责创建和管理MySQL数据库连接池
 * 使用连接池可以提高数据库操作的性能，避免频繁创建和销毁连接
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import config from '../config';
import logger from './logger';

/**
 * 数据库连接池实例
 * 使用连接池可以复用数据库连接，提高性能
 */
let pool: Pool;

/**
 * 初始化数据库连接池
 * 在应用启动时调用一次即可
 *
 * @returns 返回创建的连接池实例
 */
export const initDatabase = (): Pool => {
  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    // 字符集配置 - 确保正确处理中文
    charset: 'utf8mb4',
    // 连接池配置
    waitForConnections: true,    // 当没有可用连接时，等待而不是立即报错
    connectionLimit: 10,         // 连接池最大连接数
    queueLimit: 0,               // 等待队列的最大长度，0表示不限制
    enableKeepAlive: true,       // 启用TCP保活
    keepAliveInitialDelay: 10000, // 保活探测的初始延迟（10秒）
    // 连接超时和重连配置
    connectTimeout: 60000,       // 连接超时时间（60秒）
    idleTimeout: 60000,          // 空闲连接超时时间（60秒）
    maxIdle: 10,                 // 最大空闲连接数
  });

  logger.info('数据库连接池已初始化', {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
  });
  return pool;
};

/**
 * 获取数据库连接池实例
 * 如果连接池尚未初始化，会先进行初始化
 *
 * @returns 返回数据库连接池
 */
export const getPool = (): Pool => {
  if (!pool) {
    initDatabase();
  }
  return pool;
};

/**
 * 获取一个数据库连接
 * 用于需要事务操作的场景
 * 注意：使用完毕后必须调用 connection.release() 释放连接
 *
 * @returns 返回一个数据库连接
 */
export const getConnection = async (): Promise<PoolConnection> => {
  const p = getPool();
  return await p.getConnection();
};

/**
 * 执行SQL查询（用于SELECT语句）
 * 这是一个通用的查询方法，返回查询结果数组
 *
 * @param sql - SQL查询语句
 * @param params - 查询参数，用于替换SQL中的占位符(?)
 * @returns 返回查询结果数组
 *
 * @example
 * // 查询所有用户
 * const users = await query<User>('SELECT * FROM users');
 *
 * @example
 * // 根据ID查询用户
 * const users = await query<User>('SELECT * FROM users WHERE id = ?', [userId]);
 */
export const query = async <T extends RowDataPacket>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  const p = getPool();
  const [rows] = await p.query<T[]>(sql, params);
  return rows;
};

/**
 * 执行SQL命令（用于INSERT、UPDATE、DELETE语句）
 * 返回执行结果，包含影响的行数、插入的ID等信息
 *
 * @param sql - SQL命令语句
 * @param params - 命令参数，用于替换SQL中的占位符(?)
 * @returns 返回执行结果
 *
 * @example
 * // 插入新用户
 * const result = await execute(
 *   'INSERT INTO users (id, username, email) VALUES (?, ?, ?)',
 *   [userId, username, email]
 * );
 * console.log('插入的ID:', result.insertId);
 *
 * @example
 * // 更新用户信息
 * const result = await execute(
 *   'UPDATE users SET username = ? WHERE id = ?',
 *   [newUsername, userId]
 * );
 * console.log('影响的行数:', result.affectedRows);
 */
export const execute = async (
  sql: string,
  params?: any[]
): Promise<ResultSetHeader> => {
  const p = getPool();
  const [result] = await p.query<ResultSetHeader>(sql, params);
  return result;
};

/**
 * 关闭数据库连接池
 * 在应用关闭时调用，确保所有连接被正确释放
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('数据库连接池已关闭');
  }
};

// 导出默认对象，包含所有数据库操作方法
export default {
  initDatabase,
  getPool,
  getConnection,
  query,
  execute,
  closeDatabase,
};
