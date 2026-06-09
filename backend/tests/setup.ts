import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { closeDatabase } from '../src/utils/database';
import config from '../src/config';

dotenv.config({ path: '.env.test' });

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const initTestDatabase = async () => {
  const testDbName = config.database.database;
  
  const tempPool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    multipleStatements: true,
  });
  
  try {
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    const initSqlPath = path.join(__dirname, '../database/init.sql');
    let initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    initSql = initSql.replace(/CREATE DATABASE [^;]+;/g, '');
    initSql = initSql.replace(/USE `?\w+`?;/g, `USE \`${testDbName}\`;`);
    
    await tempPool.query(initSql);
  } finally {
    await tempPool.end();
  }
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  
  try {
    await initTestDatabase();
  } catch (error) {
    console.warn('数据库初始化警告:', getErrorMessage(error));
  }
});

afterAll(async () => {
  jest.resetAllMocks();
  try {
    await closeDatabase();
  } catch (e) {
  }
});
