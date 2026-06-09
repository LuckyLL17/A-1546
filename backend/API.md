# API 接口文档

校园二手物品交易与资源共享平台 — 后端 API 参考手册

**Base URL**: `http://localhost:3000/api`

## 通用说明

### 认证方式

需要认证的接口在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

### 统一响应格式

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {},
  "timestamp": 1703500000000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 0=成功，其他=失败（业务错误码） |
| message | string | 提示信息 |
| data | any | 响应数据（可选） |
| timestamp | number | 响应时间戳 |

### 分页响应格式

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  },
  "timestamp": 1703500000000
}
```

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| 1000 | 请求参数错误 |
| 1001 | 参数校验失败 |
| 1002 | 必填参数缺失 |
| 1100 | 未授权 |
| 1101 | Token 已过期 |
| 1102 | Token 无效 |
| 1103 | 无权限 |
| 2000 | 用户不存在 |
| 2001 | 用户名已存在 |
| 2002 | 邮箱已注册 |
| 2003 | 密码错误 |
| 2004 | 账户已禁用 |
| 2005 | 账户未激活 |
| 3000 | 物品不存在 |
| 3001 | 物品不可用 |
| 3002 | 物品已售出 |
| 3003 | 物品已下架 |
| 3004 | 物品已被预订 |
| 3005 | 物品未发布 |
| 3006 | 已收藏该物品 |
| 3007 | 未收藏该物品 |
| 4000 | 订单不存在 |
| 4001 | 订单状态不正确 |
| 4002 | 不能购买自己的物品 |
| 4003 | 已评价过此订单 |
| 5000 | 会话不存在 |
| 5001 | 聊天参数缺失 |
| 6000 | 资源不存在 |
| 6001 | 资源不可用 |

---

## 一、用户模块

### 1.1 用户注册

`POST /api/users/register`

认证：不需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名，唯一 |
| password | string | ✅ | 密码 |
| email | string | ✅ | 邮箱，唯一 |
| phone | string | ❌ | 手机号 |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "abc123456",
    "email": "zhangsan@example.com",
    "phone": "13800138000"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "credit_score": 100,
      "status": "active",
      "created_at": "2025-01-15T08:00:00.000Z"
    }
  }
}
```

**失败响应**

```json
{
  "code": 2001,
  "message": "用户名已存在"
}
```

---

### 1.2 用户登录

`POST /api/users/login`

认证：不需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |
| password | string | ✅ | 密码 |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "zhangsan", "password": "abc123456"}'
```

**成功响应**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "credit_score": 100,
      "status": "active"
    }
  }
}
```

**失败响应**

```json
{
  "code": 2003,
  "message": "密码错误"
}
```

---

### 1.3 获取个人信息

`GET /api/users/profile`

认证：✅ 需要

**请求示例**

```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "real_name": "张三",
    "student_id": "2021001",
    "avatar": "https://example.com/avatar.jpg",
    "school": "北京大学",
    "campus": "燕园",
    "dormitory": "32号楼",
    "credit_score": 100,
    "status": "active",
    "created_at": "2025-01-15T08:00:00.000Z",
    "updated_at": "2025-01-15T08:00:00.000Z"
  }
}
```

---

### 1.4 更新个人信息

`PUT /api/users/profile`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| real_name | string | ❌ | 真实姓名 |
| phone | string | ❌ | 手机号 |
| avatar | string | ❌ | 头像 URL |
| school | string | ❌ | 学校 |
| campus | string | ❌ | 校区 |
| dormitory | string | ❌ | 宿舍 |
| student_id | string | ❌ | 学号 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "real_name": "张三",
    "school": "北京大学",
    "phone": "13800138000"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "更新成功"
}
```

---

### 1.5 修改密码

`PUT /api/users/password`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| old_password | string | ✅ | 旧密码 |
| new_password | string | ✅ | 新密码 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/users/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"old_password": "abc123456", "new_password": "newpass789"}'
```

**成功响应**

```json
{
  "code": 0,
  "message": "密码修改成功"
}
```

**失败响应**

```json
{
  "code": 2003,
  "message": "原密码错误"
}
```

---

### 1.6 获取用户公开信息

`GET /api/users/:id`

认证：不需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 用户 ID |

**请求示例**

```bash
curl http://localhost:3000/api/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "zhangsan",
    "avatar": "https://example.com/avatar.jpg",
    "school": "北京大学",
    "credit_score": 100,
    "created_at": "2025-01-15T08:00:00.000Z"
  }
}
```

---

### 1.7 获取用户评价列表

`GET /api/users/:id/reviews`

认证：不需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 用户 ID |

**请求示例**

```bash
curl http://localhost:3000/api/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890/reviews
```

**成功响应**

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "order_id": "ord-xxxx-xxxx",
      "reviewer_id": "user-xxxx-xxxx",
      "reviewed_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "rating": 5,
      "content": "卖家很靠谱，物品和描述一致！",
      "is_anonymous": false,
      "created_at": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

---

## 二、物品模块

### 2.1 搜索物品

`GET /api/items`

认证：不需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ❌ | 搜索关键词（匹配标题/描述） |
| category_id | number | ❌ | 分类 ID |
| min_price | number | ❌ | 最低价格 |
| max_price | number | ❌ | 最高价格 |
| condition_level | string | ❌ | 成色：`new` / `like_new` / `good` / `fair` / `poor` |
| school | string | ❌ | 学校筛选 |
| sort_by | string | ❌ | 排序：`price_asc` / `price_desc` / `time_desc` / `time_asc` |
| page | number | ❌ | 页码，默认 1 |
| page_size | number | ❌ | 每页条数，默认 10 |

**请求示例**

```bash
curl "http://localhost:3000/api/items?keyword=MacBook&min_price=5000&max_price=10000&sort_by=price_asc&page=1&page_size=10"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "item-xxxx-xxxx",
        "seller_id": "user-xxxx-xxxx",
        "category_id": 10,
        "title": "二手MacBook Pro 2023",
        "description": "M2芯片，16G内存，成色95新",
        "original_price": 14999,
        "price": 8999,
        "condition_level": "like_new",
        "images": "[\"https://example.com/img1.jpg\"]",
        "location": "北京大学宿舍楼",
        "view_count": 120,
        "like_count": 15,
        "status": "published",
        "created_at": "2025-01-15T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 2.2 创建物品

`POST /api/items`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 物品标题 |
| price | number | ✅ | 售价（必须为正数） |
| description | string | ❌ | 物品描述 |
| original_price | number | ❌ | 原价 |
| category_id | number | ❌ | 分类 ID |
| condition_level | string | ❌ | 成色：`new` / `like_new` / `good` / `fair` / `poor` |
| images | string[] | ❌ | 图片 URL 数组 |
| location | string | ❌ | 交易地点 |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "二手MacBook Pro 2023",
    "description": "M2芯片，16G内存，成色95新",
    "price": 8999,
    "original_price": 14999,
    "category_id": 10,
    "condition_level": "like_new",
    "location": "北京大学宿舍楼"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "item-xxxx-xxxx"
  }
}
```

> 注意：创建后物品状态为 `draft`（草稿），需调用发布接口上架。

---

### 2.3 获取物品详情

`GET /api/items/:id`

认证：🔶 可选（登录后返回是否已收藏等额外信息）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求示例**

```bash
curl http://localhost:3000/api/items/item-xxxx-xxxx
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "id": "item-xxxx-xxxx",
    "seller_id": "user-xxxx-xxxx",
    "category_id": 10,
    "title": "二手MacBook Pro 2023",
    "description": "M2芯片，16G内存，成色95新",
    "original_price": 14999,
    "price": 8999,
    "condition_level": "like_new",
    "images": "[\"https://example.com/img1.jpg\"]",
    "location": "北京大学宿舍楼",
    "view_count": 121,
    "like_count": 15,
    "status": "published",
    "created_at": "2025-01-15T08:00:00.000Z",
    "updated_at": "2025-01-15T08:00:00.000Z",
    "seller": {
      "id": "user-xxxx-xxxx",
      "username": "zhangsan",
      "avatar": "https://example.com/avatar.jpg",
      "school": "北京大学",
      "credit_score": 100
    },
    "is_favorited": false
  }
}
```

---

### 2.4 更新物品

`PUT /api/items/:id`

认证：✅ 需要（仅物品所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ❌ | 物品标题 |
| description | string | ❌ | 物品描述 |
| price | number | ❌ | 售价 |
| original_price | number | ❌ | 原价 |
| category_id | number | ❌ | 分类 ID |
| condition_level | string | ❌ | 成色 |
| images | string[] | ❌ | 图片 URL 数组 |
| location | string | ❌ | 交易地点 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/items/item-xxxx-xxxx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"price": 7999, "description": "降价出售，急出"}'
```

**成功响应**

```json
{
  "code": 0,
  "message": "更新成功"
}
```

---

### 2.5 删除物品

`DELETE /api/items/:id`

认证：✅ 需要（仅物品所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求示例**

```bash
curl -X DELETE http://localhost:3000/api/items/item-xxxx-xxxx \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

### 2.6 发布物品（上架）

`POST /api/items/:id/publish`

认证：✅ 需要（仅物品所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/items/item-xxxx-xxxx/publish \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "发布成功"
}
```

**失败响应**

```json
{
  "code": 3005,
  "message": "物品状态不允许发布"
}
```

---

### 2.7 收藏物品

`POST /api/items/:id/favorite`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/items/item-xxxx-xxxx/favorite \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "收藏成功"
}
```

**失败响应**

```json
{
  "code": 3006,
  "message": "已收藏该物品"
}
```

---

### 2.8 取消收藏

`DELETE /api/items/:id/favorite`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 物品 ID |

**请求示例**

```bash
curl -X DELETE http://localhost:3000/api/items/item-xxxx-xxxx/favorite \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "取消收藏成功"
}
```

---

### 2.9 获取我的物品列表

`GET /api/items/my/list`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | ❌ | 筛选状态：`draft` / `published` / `sold` / `removed` |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/items/my/list?status=published" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "item-xxxx-xxxx",
        "title": "二手MacBook Pro 2023",
        "price": 8999,
        "status": "published",
        "view_count": 120,
        "like_count": 15,
        "created_at": "2025-01-15T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 2.10 获取我的收藏列表

`GET /api/items/my/favorites`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/items/my/favorites" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "item-xxxx-xxxx",
        "title": "二手MacBook Pro 2023",
        "price": 8999,
        "status": "published",
        "created_at": "2025-01-15T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 2.11 获取分类列表

`GET /api/categories`

认证：不需要

**请求示例**

```bash
curl http://localhost:3000/api/categories
```

**成功响应**

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "电子产品",
      "parent_id": null,
      "icon": "📱",
      "sort_order": 1,
      "status": "active",
      "children": [
        {
          "id": 10,
          "name": "笔记本电脑",
          "parent_id": 1,
          "sort_order": 1,
          "status": "active"
        }
      ]
    }
  ]
}
```

---

## 三、订单模块

> 所有订单接口均需要认证

### 3.1 创建订单

`POST /api/orders`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| item_id | string (UUID) | ✅ | 物品 ID |
| delivery_method | string | ❌ | 交付方式：`face_to_face`（面交）/ `express`（快递）/ `self_pickup`（自取），默认 `face_to_face` |
| delivery_address | string | ❌ | 收货地址（快递方式时必填，最长 200 字符） |
| remark | string | ❌ | 备注（最长 500 字符） |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "item_id": "item-xxxx-xxxx",
    "delivery_method": "face_to_face",
    "remark": "明天中午12点在食堂门口交易"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "下单成功",
  "data": {
    "id": "order-xxxx-xxxx",
    "order_no": "ORD20250115080000001",
    "item_id": "item-xxxx-xxxx",
    "seller_id": "user-seller-xxxx",
    "buyer_id": "user-buyer-xxxx",
    "price": 8999,
    "status": "pending",
    "delivery_method": "face_to_face",
    "remark": "明天中午12点在食堂门口交易",
    "created_at": "2025-01-15T08:00:00.000Z"
  }
}
```

**失败响应**

```json
{
  "code": 4002,
  "message": "不能购买自己的物品"
}
```

```json
{
  "code": 3001,
  "message": "物品不可用"
}
```

---

### 3.2 获取订单详情

`GET /api/orders/:id`

认证：✅ 需要（仅买家或卖家可查看）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求示例**

```bash
curl http://localhost:3000/api/orders/order-xxxx-xxxx \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "id": "order-xxxx-xxxx",
    "order_no": "ORD20250115080000001",
    "item_id": "item-xxxx-xxxx",
    "seller_id": "user-seller-xxxx",
    "buyer_id": "user-buyer-xxxx",
    "price": 8999,
    "status": "paid",
    "payment_method": "wechat",
    "payment_time": "2025-01-15T09:00:00.000Z",
    "delivery_method": "face_to_face",
    "remark": "明天中午12点在食堂门口交易",
    "created_at": "2025-01-15T08:00:00.000Z",
    "updated_at": "2025-01-15T09:00:00.000Z",
    "item": {
      "id": "item-xxxx-xxxx",
      "title": "二手MacBook Pro 2023",
      "price": 8999,
      "images": "[\"https://example.com/img1.jpg\"]"
    },
    "review": null
  }
}
```

---

### 3.3 支付订单

`POST /api/orders/:id/pay`

认证：✅ 需要（仅买家）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| payment_method | string | ❌ | 支付方式，如 `wechat` / `alipay` |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders/order-xxxx-xxxx/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"payment_method": "wechat"}'
```

**成功响应**

```json
{
  "code": 0,
  "message": "支付成功"
}
```

**失败响应**

```json
{
  "code": 4001,
  "message": "订单状态不允许支付"
}
```

---

### 3.4 发货

`POST /api/orders/:id/ship`

认证：✅ 需要（仅卖家）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders/order-xxxx-xxxx/ship \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "发货成功"
}
```

---

### 3.5 确认收货

`POST /api/orders/:id/complete`

认证：✅ 需要（仅买家）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders/order-xxxx-xxxx/complete \
  -H "Authorization: Bearer $BUYER_TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "确认收货成功"
}
```

---

### 3.6 取消订单

`POST /api/orders/:id/cancel`

认证：✅ 需要（买家或卖家）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders/order-xxxx-xxxx/cancel \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "取消成功"
}
```

**失败响应**

```json
{
  "code": 4001,
  "message": "订单状态不允许取消"
}
```

---

### 3.7 评价订单

`POST /api/orders/:id/review`

认证：✅ 需要（仅买家，订单状态为 `completed`）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 订单 ID |

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| rating | number | ✅ | 评分（1-5） |
| content | string | ❌ | 评价内容 |
| images | string[] | ❌ | 评价图片 URL 数组 |
| is_anonymous | boolean | ❌ | 是否匿名，默认 false |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/orders/order-xxxx-xxxx/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "rating": 5,
    "content": "物品和描述一致，卖家很靠谱！",
    "is_anonymous": false
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "评价成功"
}
```

**失败响应**

```json
{
  "code": 4003,
  "message": "已评价过此订单"
}
```

---

### 3.8 获取买家订单列表

`GET /api/orders/buyer`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | ❌ | 筛选状态：`pending` / `paid` / `shipping` / `completed` / `cancelled` |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/orders/buyer?status=paid" \
  -H "Authorization: Bearer $BUYER_TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "order-xxxx-xxxx",
        "order_no": "ORD20250115080000001",
        "price": 8999,
        "status": "paid",
        "delivery_method": "face_to_face",
        "created_at": "2025-01-15T08:00:00.000Z",
        "item": {
          "id": "item-xxxx-xxxx",
          "title": "二手MacBook Pro 2023",
          "images": "[\"https://example.com/img1.jpg\"]"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 3.9 获取卖家订单列表

`GET /api/orders/seller`

认证：✅ 需要

**查询参数（Query）**

与买家订单列表相同（`status` / `page` / `page_size`）。

**请求示例**

```bash
curl "http://localhost:3000/api/orders/seller" \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

**成功响应**

格式与买家订单列表一致。

---

## 四、聊天模块

> 所有聊天接口均需要认证

### 4.1 发送消息

`POST /api/chat/messages`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| receiver_id | string (UUID) | ❌ | 接收者 ID（新会话时必填） |
| session_id | string (UUID) | ❌ | 会话 ID（已有会话时填写） |
| item_id | string (UUID) | ❌ | 关联物品 ID |
| content | string | ✅ | 消息内容 |
| message_type | string | ❌ | 消息类型：`text`（默认）/ `image` / `item` |

> `receiver_id` 和 `session_id` 至少提供一个。新会话提供 `receiver_id`，已有会话提供 `session_id`。

**请求示例**

```bash
curl -X POST http://localhost:3000/api/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "receiver_id": "user-seller-xxxx",
    "content": "你好，请问还有其他颜色吗？",
    "message_type": "text"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "发送成功",
  "data": {
    "id": 1,
    "session_id": "session-xxxx-xxxx",
    "sender_id": "user-buyer-xxxx",
    "content": "你好，请问还有其他颜色吗？",
    "message_type": "text",
    "is_read": false,
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 4.2 获取会话列表

`GET /api/chat/sessions`

认证：✅ 需要

**请求示例**

```bash
curl http://localhost:3000/api/chat/sessions \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": [
    {
      "id": "session-xxxx-xxxx",
      "item_id": "item-xxxx-xxxx",
      "user1_id": "user-buyer-xxxx",
      "user2_id": "user-seller-xxxx",
      "last_message": "你好，请问还有其他颜色吗？",
      "last_message_time": "2025-01-15T10:00:00.000Z",
      "created_at": "2025-01-15T10:00:00.000Z",
      "unread_count": 1,
      "other_user": {
        "id": "user-seller-xxxx",
        "username": "zhangsan",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  ]
}
```

---

### 4.3 获取会话消息

`GET /api/chat/sessions/:id/messages`

认证：✅ 需要（仅会话参与者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 会话 ID |

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/chat/sessions/session-xxxx-xxxx/messages?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "session_id": "session-xxxx-xxxx",
        "sender_id": "user-buyer-xxxx",
        "content": "你好，请问还有其他颜色吗？",
        "message_type": "text",
        "is_read": true,
        "created_at": "2025-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "session_id": "session-xxxx-xxxx",
        "sender_id": "user-seller-xxxx",
        "content": "有的，还有银色和黑色",
        "message_type": "text",
        "is_read": false,
        "created_at": "2025-01-15T10:05:00.000Z"
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

### 4.4 标记会话已读

`POST /api/chat/sessions/:id/read`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 会话 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/chat/sessions/session-xxxx-xxxx/read \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "标记已读成功"
}
```

---

### 4.5 获取未读消息数

`GET /api/chat/unread-count`

认证：✅ 需要

**请求示例**

```bash
curl http://localhost:3000/api/chat/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "count": 3
  }
}
```

---

## 五、资源共享模块

### 5.1 搜索资源

`GET /api/resources`

认证：不需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ❌ | 搜索关键词 |
| resource_type | string | ❌ | 资源类型：`document` / `video` / `tool` / `other` |
| is_free | boolean | ❌ | 是否免费 |
| tags | string[] | ❌ | 标签筛选 |
| sort_by | string | ❌ | 排序：`time_desc` / `download_desc` / `like_desc` |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/resources?keyword=高数&resource_type=document&is_free=true"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "res-xxxx-xxxx",
        "user_id": "user-xxxx-xxxx",
        "title": "高等数学期末复习资料",
        "description": "包含历年真题和详细解析",
        "resource_type": "document",
        "file_url": "https://example.com/math.pdf",
        "file_size": 2048000,
        "download_count": 56,
        "like_count": 23,
        "tags": "[\"高数\",\"期末\",\"复习\"]",
        "is_free": true,
        "points_required": 0,
        "status": "approved",
        "created_at": "2025-01-10T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 5.2 创建资源

`POST /api/resources`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 资源标题 |
| description | string | ❌ | 资源描述 |
| resource_type | string | ✅ | 类型：`document` / `video` / `tool` / `other` |
| file_url | string | ❌ | 文件 URL |
| file_size | number | ❌ | 文件大小（字节） |
| tags | string[] | ❌ | 标签数组 |
| is_free | boolean | ❌ | 是否免费，默认 true |
| points_required | number | ❌ | 所需积分（非免费时） |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "高等数学期末复习资料",
    "description": "包含历年真题和详细解析",
    "resource_type": "document",
    "file_url": "https://example.com/math.pdf",
    "tags": ["高数", "期末", "复习"],
    "is_free": true
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "创建成功，请发布后对外可见",
  "data": {
    "id": "res-xxxx-xxxx"
  }
}
```

> 注意：创建后资源状态为 `pending`，需要资源所有者调用发布接口变更为 `approved` 后，才可被公开搜索和下载。

---

### 5.3 获取资源详情

`GET /api/resources/:id`

认证：不需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求示例**

```bash
curl http://localhost:3000/api/resources/res-xxxx-xxxx
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "id": "res-xxxx-xxxx",
    "user_id": "user-xxxx-xxxx",
    "title": "高等数学期末复习资料",
    "description": "包含历年真题和详细解析",
    "resource_type": "document",
    "file_url": "https://example.com/math.pdf",
    "file_size": 2048000,
    "download_count": 56,
    "like_count": 23,
    "tags": "[\"高数\",\"期末\",\"复习\"]",
    "is_free": true,
    "points_required": 0,
    "status": "approved",
    "created_at": "2025-01-10T08:00:00.000Z",
    "updated_at": "2025-01-10T08:00:00.000Z",
    "uploader": {
      "id": "user-xxxx-xxxx",
      "username": "zhangsan",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

---

### 5.4 更新资源

`PUT /api/resources/:id`

认证：✅ 需要（仅资源所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ❌ | 资源标题 |
| description | string | ❌ | 资源描述 |
| resource_type | string | ❌ | 资源类型 |
| file_url | string | ❌ | 文件 URL |
| tags | string[] | ❌ | 标签数组 |
| is_free | boolean | ❌ | 是否免费 |
| points_required | number | ❌ | 所需积分 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/resources/res-xxxx-xxxx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "高等数学期末复习资料（更新版）"}'
```

**成功响应**

```json
{
  "code": 0,
  "message": "更新成功"
}
```

---

### 5.5 删除资源

`DELETE /api/resources/:id`

认证：✅ 需要（仅资源所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求示例**

```bash
curl -X DELETE http://localhost:3000/api/resources/res-xxxx-xxxx \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

### 5.6 发布资源

`POST /api/resources/:id/publish`

认证：✅ 需要（仅资源所有者）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/resources/res-xxxx-xxxx/publish \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "发布成功"
}
```

---

### 5.7 下载资源

`POST /api/resources/:id/download`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/resources/res-xxxx-xxxx/download \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "file_url": "https://example.com/math.pdf"
  }
}
```

---

### 5.8 点赞资源

`POST /api/resources/:id/like`

认证：不需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 资源 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/resources/res-xxxx-xxxx/like
```

**成功响应**

```json
{
  "code": 0,
  "message": "点赞成功"
}
```

---

### 5.9 获取我的资源列表

`GET /api/resources/my/list`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/resources/my/list" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "res-xxxx-xxxx",
        "title": "高等数学期末复习资料",
        "resource_type": "document",
        "download_count": 56,
        "like_count": 23,
        "status": "approved",
        "created_at": "2025-01-10T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 5.10 获取我的下载记录

`GET /api/resources/my/downloads`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/resources/my/downloads" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

格式与资源列表一致。

---

## 六、通知模块

> 所有通知接口均需要认证

### 6.1 获取通知列表

`GET /api/notifications`

认证：✅ 需要

**查询参数（Query）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

**请求示例**

```bash
curl "http://localhost:3000/api/notifications?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "user_id": "user-xxxx-xxxx",
        "title": "新订单通知",
        "content": "您有一笔新订单，物品：二手MacBook Pro 2023",
        "notification_type": "order",
        "related_id": "order-xxxx-xxxx",
        "is_read": false,
        "created_at": "2025-01-15T08:00:00.000Z"
      },
      {
        "id": 2,
        "user_id": "user-xxxx-xxxx",
        "title": "新评价通知",
        "content": "买家对您的交易进行了评价",
        "notification_type": "review",
        "related_id": "order-xxxx-xxxx",
        "is_read": true,
        "created_at": "2025-01-16T10:00:00.000Z"
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 6.2 获取未读通知数

`GET /api/notifications/unread-count`

认证：✅ 需要

**请求示例**

```bash
curl http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": {
    "count": 5
  }
}
```

---

### 6.3 标记单条通知已读

`POST /api/notifications/:id/read`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 通知 ID |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/notifications/1/read \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "标记已读成功"
}
```

---

### 6.4 全部标记已读

`POST /api/notifications/read-all`

认证：✅ 需要

**请求示例**

```bash
curl -X POST http://localhost:3000/api/notifications/read-all \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "全部标记已读成功"
}
```

---

### 6.5 删除通知

`DELETE /api/notifications/:id`

认证：✅ 需要

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 通知 ID |

**请求示例**

```bash
curl -X DELETE http://localhost:3000/api/notifications/1 \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

## 七、举报模块

> 所有举报接口均需要认证

### 7.1 创建举报

`POST /api/reports`

认证：✅ 需要

**请求参数（Body JSON）**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| target_type | string | ✅ | 举报目标类型：`user` / `item` / `resource` / `message` |
| target_id | string | ✅ | 举报目标 ID |
| reason | string | ✅ | 举报原因 |
| description | string | ❌ | 详细描述 |
| images | string[] | ❌ | 举证图片 URL 数组 |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "target_type": "item",
    "target_id": "item-xxxx-xxxx",
    "reason": "虚假信息",
    "description": "物品描述与实际不符"
  }'
```

**成功响应**

```json
{
  "code": 0,
  "message": "举报成功"
}
```

---

### 7.2 获取我的举报列表

`GET /api/reports/my`

认证：✅ 需要

**请求示例**

```bash
curl http://localhost:3000/api/reports/my \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应**

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "reporter_id": "user-xxxx-xxxx",
      "target_type": "item",
      "target_id": "item-xxxx-xxxx",
      "reason": "虚假信息",
      "description": "物品描述与实际不符",
      "status": "pending",
      "created_at": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

---

## 八、健康检查

`GET /health`

认证：不需要

**请求示例**

```bash
curl http://localhost:3000/health
```

**成功响应**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T08:00:00.000Z",
  "version": "1.0.0"
}
```
