/**
 * 数据验证工具模块
 * 提供常用的数据验证方法，用于验证用户输入
 */

/**
 * 验证邮箱格式是否正确
 * 
 * @param email - 待验证的邮箱地址
 * @returns 返回验证结果，true表示格式正确
 * 
 * @example
 * isValidEmail('test@example.com'); // true
 * isValidEmail('invalid-email');    // false
 */
export const isValidEmail = (email: string): boolean => {
  // 邮箱正则表达式：用户名@域名.后缀
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证手机号格式是否正确（中国大陆手机号）
 * 
 * @param phone - 待验证的手机号
 * @returns 返回验证结果，true表示格式正确
 * 
 * @example
 * isValidPhone('13812345678'); // true
 * isValidPhone('12345678');    // false
 */
export const isValidPhone = (phone: string): boolean => {
  // 中国大陆手机号：1开头，第二位是3-9，共11位
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证用户名格式是否正确
 * 规则：3-20个字符，只能包含字母、数字、下划线
 * 
 * @param username - 待验证的用户名
 * @returns 返回验证结果，true表示格式正确
 * 
 * @example
 * isValidUsername('user_123');  // true
 * isValidUsername('ab');        // false（太短）
 * isValidUsername('user@123');  // false（包含特殊字符）
 */
export const isValidUsername = (username: string): boolean => {
  // 用户名正则：字母开头，3-20个字符，只能包含字母、数字、下划线
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  return usernameRegex.test(username);
};

/**
 * 验证密码强度是否符合要求
 * 规则：6-20个字符，必须包含字母和数字
 * 
 * @param password - 待验证的密码
 * @returns 返回验证结果，true表示符合要求
 * 
 * @example
 * isValidPassword('abc123');    // true
 * isValidPassword('123456');    // false（没有字母）
 * isValidPassword('abcdef');    // false（没有数字）
 */
export const isValidPassword = (password: string): boolean => {
  // 密码长度检查
  if (password.length < 6 || password.length > 20) {
    return false;
  }
  // 必须包含至少一个字母
  const hasLetter = /[a-zA-Z]/.test(password);
  // 必须包含至少一个数字
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
};

/**
 * 验证学号格式是否正确
 * 规则：6-12位数字
 * 
 * @param studentId - 待验证的学号
 * @returns 返回验证结果，true表示格式正确
 */
export const isValidStudentId = (studentId: string): boolean => {
  const studentIdRegex = /^\d{6,12}$/;
  return studentIdRegex.test(studentId);
};

/**
 * 验证价格是否合法
 * 规则：大于等于0的数字，最多两位小数
 * 
 * @param price - 待验证的价格
 * @returns 返回验证结果，true表示合法
 * 
 * @example
 * isValidPrice(99.99);  // true
 * isValidPrice(-1);     // false
 * isValidPrice(99.999); // false
 */
export const isValidPrice = (price: number): boolean => {
  if (typeof price !== 'number' || isNaN(price)) {
    return false;
  }
  if (price < 0) {
    return false;
  }
  // 检查小数位数是否超过2位
  const decimalPart = price.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return false;
  }
  return true;
};

/**
 * 验证字符串是否为空
 * 
 * @param str - 待验证的字符串
 * @returns 返回验证结果，true表示为空
 */
export const isEmpty = (str: string | undefined | null): boolean => {
  return str === undefined || str === null || str.trim() === '';
};

/**
 * 验证字符串长度是否在指定范围内
 * 
 * @param str - 待验证的字符串
 * @param min - 最小长度
 * @param max - 最大长度
 * @returns 返回验证结果，true表示长度符合要求
 */
export const isLengthValid = (str: string, min: number, max: number): boolean => {
  if (isEmpty(str)) {
    return min === 0;
  }
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * 验证UUID格式是否正确
 * 
 * @param uuid - 待验证的UUID
 * @returns 返回验证结果，true表示格式正确
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 验证订单标识是否有效
 * 支持UUID格式的订单ID或纯数字格式的订单号
 * 
 * @param orderIdOrNo - 订单ID或订单号
 * @returns 返回验证结果，true表示格式正确
 */
export const isValidOrderId = (orderIdOrNo: string): boolean => {
  if (isEmpty(orderIdOrNo)) {
    return false;
  }
  // UUID格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // 订单号格式：纯数字，长度14-24位
  const orderNoRegex = /^\d{14,24}$/;
  return uuidRegex.test(orderIdOrNo) || orderNoRegex.test(orderIdOrNo);
};

/**
 * 验证评分是否合法
 * 规则：1-5的整数
 * 
 * @param rating - 待验证的评分
 * @returns 返回验证结果，true表示合法
 */
export const isValidRating = (rating: number): boolean => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
};

// 导出所有验证方法
export default {
  isValidEmail,
  isValidPhone,
  isValidUsername,
  isValidPassword,
  isValidStudentId,
  isValidPrice,
  isEmpty,
  isLengthValid,
  isValidUUID,
  isValidOrderId,
  isValidRating,
};
