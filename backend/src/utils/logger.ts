/**
 * 结构化日志模块
 * 提供统一的日志记录能力，支持多级别日志、请求追踪和结构化输出
 * 所有环境均生效，生产环境输出 JSON 格式便于日志采集
 */

import config from '../config';

/**
 * 日志级别枚举
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/** 日志级别名称映射 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/** 根据环境确定最低日志级别：开发环境输出 DEBUG，生产环境输出 INFO */
const MIN_LOG_LEVEL: LogLevel =
  config.server.env === 'development' ? LogLevel.DEBUG : LogLevel.INFO;

/**
 * 日志条目接口
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any;
}

/**
 * 格式化日志输出
 * 开发环境：可读的单行格式
 * 生产环境：JSON 格式，便于 ELK / CloudWatch 等日志系统采集
 */
const formatLog = (entry: LogEntry): string => {
  if (config.server.env === 'development') {
    const { timestamp, level, message, ...extra } = entry;
    const extraStr = Object.keys(extra).length > 0 ? ' ' + JSON.stringify(extra) : '';
    return `[${timestamp}] [${level}] ${message}${extraStr}`;
  }
  return JSON.stringify(entry);
};

/**
 * 核心日志输出方法
 */
const log = (level: LogLevel, message: string, meta?: Record<string, any>): void => {
  if (level < MIN_LOG_LEVEL) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LOG_LEVEL_NAMES[level],
    message,
    ...meta,
  };

  const output = formatLog(entry);

  if (level >= LogLevel.ERROR) {
    console.error(output);
  } else if (level >= LogLevel.WARN) {
    console.warn(output);
  } else {
    console.log(output);
  }
};

/**
 * 日志工具对象
 */
const logger = {
  /**
   * 调试日志 - 仅开发环境输出
   */
  debug(message: string, meta?: Record<string, any>): void {
    log(LogLevel.DEBUG, message, meta);
  },

  /**
   * 信息日志 - 记录正常业务操作
   */
  info(message: string, meta?: Record<string, any>): void {
    log(LogLevel.INFO, message, meta);
  },

  /**
   * 警告日志 - 记录潜在问题
   */
  warn(message: string, meta?: Record<string, any>): void {
    log(LogLevel.WARN, message, meta);
  },

  /**
   * 错误日志 - 记录错误和异常
   */
  error(message: string, meta?: Record<string, any>): void {
    log(LogLevel.ERROR, message, meta);
  },

  /**
   * 请求日志 - 记录 HTTP 请求和响应信息
   */
  request(data: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userId?: string;
  }): void {
    const level = data.statusCode >= 500 ? LogLevel.ERROR
      : data.statusCode >= 400 ? LogLevel.WARN
      : LogLevel.INFO;

    log(level, `${data.method} ${data.url} ${data.statusCode} ${data.duration}ms`, {
      type: 'request',
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      duration: data.duration,
      ip: data.ip,
      userId: data.userId,
    });
  },

  /**
   * 业务操作日志 - 记录关键业务操作（订单、支付等）
   */
  business(action: string, meta?: Record<string, any>): void {
    log(LogLevel.INFO, action, { type: 'business', ...meta });
  },
};

export default logger;
