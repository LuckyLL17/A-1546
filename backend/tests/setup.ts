import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getPool, closeDatabase } from '../src/utils/database';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  
  try {
    const pool = getPool();
    
    const initSqlPath = path.join(__dirname, '../database/init.sql');
    let initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    initSql = initSql.replace(/CREATE DATABASE IF NOT EXISTS campus_trade/g, 'CREATE DATABASE IF NOT EXISTS campus_trade_test');
    initSql = initSql.replace(/USE campus_trade;/g, 'USE campus_trade_test;');
    
    const statements = initSql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (e) {
        }
      }
    }
    
  } catch (error) {
    console.warn('数据库初始化警告:', error.message);
  }
});

afterAll(async () => {
  jest.resetAllMocks();
  try {
    await closeDatabase();
  } catch (e) {
  }
});
