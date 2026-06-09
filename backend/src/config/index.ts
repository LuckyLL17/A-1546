/**
 * 应用配置模块
 * 集中管理所有配置项，从环境变量读取配置值
 * 如果环境变量未设置，则使用默认值
 */

/**
 * 数据库配置接口
 * 定义连接MySQL数据库所需的所有参数
 */
interface DatabaseConfig {
  host: string;        // 数据库主机地址
  port: number;        // 数据库端口
  user: string;        // 数据库用户名
  password: string;    // 数据库密码
  database: string;    // 数据库名称
}

/**
 * JWT配置接口
 * 定义JSON Web Token相关的配置
 */
interface JWTConfig {
  secret: string;      // JWT签名密钥
  expiresIn: string;   // Token过期时间
}

/**
 * 服务器配置接口
 */
interface ServerConfig {
  port: number;        // 服务器监听端口
  env: string;         // 运行环境（development/production）
}

/**
 * 应用配置接口
 * 整合所有子配置
 */
interface AppConfig {
  database: DatabaseConfig;
  jwt: JWTConfig;
  server: ServerConfig;
}

/**
 * 应用配置对象
 * 从环境变量读取配置，未设置时使用默认值
 */
const config: AppConfig = {
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_trade',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_default_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 服务器配置
  server: {
    port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
};

export default config;
