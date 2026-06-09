/**
 * 自定义应用错误类
 * 提供结构化的错误信息，包含业务错误码和 HTTP 状态码
 * 便于全局错误处理中间件统一处理并返回标准格式的错误响应
 */

/**
 * 业务错误码枚举
 * 前端可根据错误码做精细化处理
 */
export enum ErrorCode {
  // 通用错误 (1000-1099)
  BAD_REQUEST = 1000,
  VALIDATION_ERROR = 1001,
  PARAM_MISSING = 1002,

  // 认证与权限 (1100-1199)
  UNAUTHORIZED = 1100,
  TOKEN_EXPIRED = 1101,
  TOKEN_INVALID = 1102,
  FORBIDDEN = 1103,

  // 用户相关 (2000-2099)
  USER_NOT_FOUND = 2000,
  USERNAME_EXISTS = 2001,
  EMAIL_EXISTS = 2002,
  PASSWORD_WRONG = 2003,
  ACCOUNT_DISABLED = 2004,
  ACCOUNT_INACTIVE = 2005,

  // 物品相关 (3000-3099)
  ITEM_NOT_FOUND = 3000,
  ITEM_NOT_AVAILABLE = 3001,
  ITEM_ALREADY_SOLD = 3002,
  ITEM_ALREADY_REMOVED = 3003,
  ITEM_ALREADY_RESERVED = 3004,
  ITEM_NOT_PUBLISHED = 3005,
  ITEM_ALREADY_FAVORITED = 3006,
  ITEM_NOT_FAVORITED = 3007,

  // 订单相关 (4000-4099)
  ORDER_NOT_FOUND = 4000,
  ORDER_STATUS_INVALID = 4001,
  ORDER_SELF_PURCHASE = 4002,
  ORDER_ALREADY_REVIEWED = 4003,

  // 聊天相关 (5000-5099)
  CHAT_SESSION_NOT_FOUND = 5000,
  CHAT_PARAM_MISSING = 5001,

  // 资源相关 (6000-6099)
  RESOURCE_NOT_FOUND = 6000,
  RESOURCE_UNAVAILABLE = 6001,
}

/**
 * 自定义应用错误类
 * 继承自 Error，附带 HTTP 状态码和业务错误码
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  public readonly httpStatus: number;
  /** 业务错误码 */
  public readonly errorCode: ErrorCode;

  constructor(message: string, errorCode: ErrorCode, httpStatus: number = 400) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;

    // 修复 TypeScript 继承内置类的原型链问题
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 快捷方法：400 Bad Request
   */
  static badRequest(message: string, errorCode: ErrorCode = ErrorCode.BAD_REQUEST): AppError {
    return new AppError(message, errorCode, 400);
  }

  /**
   * 快捷方法：401 Unauthorized
   */
  static unauthorized(message: string = '未授权，请先登录', errorCode: ErrorCode = ErrorCode.UNAUTHORIZED): AppError {
    return new AppError(message, errorCode, 401);
  }

  /**
   * 快捷方法：403 Forbidden
   */
  static forbidden(message: string = '无权访问', errorCode: ErrorCode = ErrorCode.FORBIDDEN): AppError {
    return new AppError(message, errorCode, 403);
  }

  /**
   * 快捷方法：404 Not Found
   */
  static notFound(message: string = '资源不存在', errorCode: ErrorCode = ErrorCode.BAD_REQUEST): AppError {
    return new AppError(message, errorCode, 404);
  }
}

/**
 * 防御性参数校验：确保必填的 ID 参数非空且为合法字符串
 * 用于 service 层入口处校验关键参数，防止无效数据穿透到数据库层
 *
 * @param value - 待校验的值
 * @param paramName - 参数名称（用于错误提示）
 * @param errorCode - 业务错误码
 */
export const assertRequiredId = (
  value: string | undefined | null,
  paramName: string,
  errorCode: ErrorCode = ErrorCode.PARAM_MISSING
): void => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw AppError.badRequest(`${paramName}不能为空`, errorCode);
  }
};
