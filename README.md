# 校园二手物品交易与资源共享平台

## How to Run

### 环境要求

- Docker >= 20.0
- Docker Compose >= 2.0

### 启动步骤

```bash
# 1. 克隆项目
git clone <repo-url>
cd label-01546

# 2. 一键启动所有服务
docker-compose up --build -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看后端日志
docker-compose logs -f backend

# 5. 停止所有服务
docker-compose down

# 6. 停止并清除数据
docker-compose down -v
```

启动后：
- 后端 API 地址：http://localhost:3000
- 健康检查：http://localhost:3000/health
- API 基础路径：http://localhost:3000/api

### 本地开发环境启动（不使用 Docker）

#### 环境要求

- Node.js >= 18.0
- MySQL >= 8.0
- npm >= 9.0

#### 方式一：使用启动脚本（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x backend/scripts/start-local.sh

# 2. 以开发模式启动（支持热重载）
./backend/scripts/start-local.sh --dev

# 或以生产模式启动（先编译再运行）
./backend/scripts/start-local.sh --prod

# 仅安装依赖
./backend/scripts/start-local.sh --install

# 查看帮助
./backend/scripts/start-local.sh --help
```

#### 方式二：手动启动

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改数据库密码等配置
# npm run dev / npm run start 会自动加载 backend/.env（无需手动 export）

# 4. 初始化数据库（确保 MySQL 已启动）
mysql -u root -p < database/init.sql

# 5. 编译并启动（生产模式）
npm run build
npm run start

# 或直接以开发模式启动（无需编译，支持热重载）
npm run dev
```

#### 环境变量配置

在 `backend/.env` 文件中配置以下环境变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password    # 修改为你的 MySQL 密码
DB_NAME=campus_trade

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=development
```

## Services

| 服务 | 说明 | 端口 | 技术栈 |
|------|------|------|--------|
| backend | 后端 API 服务 | 3000 | TypeScript + Express.js |
| mysql | MySQL 数据库 | 3306 | MySQL 8.0 |

## 测试账号

系统启动后需要通过注册接口创建账号：

```bash
# 注册用户
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "email": "test@example.com"
  }'

# 登录获取 Token
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123"
  }'
```

登录成功后会返回 JWT Token，后续请求在 Header 中携带：
```
Authorization: Bearer <token>
```

## 题目内容

开发一个校园二手物品交易与资源共享平台的后端系统，具体要求如下：

1. 技术栈要求：
- 编程语言：使用TypeScript进行所有代码编写，充分利用其类型系统、接口、泛型等特性确保代码类型安全
- 数据库：采用MySQL数据库进行数据存储与管理

2. 开发规范：
- 模块化开发：代码需采用模块化组织方式，按功能划分清晰的模块结构，确保良好的可维护性和扩展性
- 代码注释：为所有关键代码（包括函数、类、复杂逻辑）添加详细注释，注释内容应通俗易懂，确保编程基础薄弱的开发人员能够理解代码功能和实现逻辑

3. 功能实现：
- 专注于后端功能开发，无需实现前端页面
- 实现二手物品交易的核心业务逻辑，包括但不限于：用户管理、物品发布与管理、交易流程、资源共享等基础功能模块
- 确保所有功能能够正常运行，满足基本业务需求

4. 交付要求：
- 提供完整的后端源代码
- 包含必要的数据库设计文件及初始化脚本
- 无需编写测试用例，以功能实现为首要目标

---

## 项目介绍

本项目是一个校园二手物品交易与资源共享平台的后端系统，基于 TypeScript + Express + MySQL 开发，采用 Docker 容器化部署。

### 功能模块

- **用户管理**：注册、登录、JWT 认证、个人信息管理、信用积分
- **物品管理**：发布、编辑、搜索（关键词/分类/价格/新旧程度）、收藏、分类体系
- **交易流程**：下单、支付、发货、确认收货、取消订单
- **评价系统**：交易完成后互评、匿名评价、信用分自动调整
- **聊天功能**：买卖双方即时沟通、会话管理、未读消息统计
- **资源共享**：学习资料分享、资源搜索与下载、点赞
- **通知系统**：系统通知、未读统计、批量已读
- **举报功能**：违规内容举报

### 项目结构

```
label-01546/
├── docker-compose.yml              # Docker Compose 编排文件
├── .gitignore                      # Git 忽略规则
├── README.md                       # 项目说明文档
└── backend/                        # 后端项目
    ├── Dockerfile                  # 后端 Docker 构建文件
    ├── wait-for-db.sh              # 数据库等待脚本
    ├── package.json                # Node.js 依赖配置
    ├── package-lock.json           # 依赖版本锁定文件
    ├── tsconfig.json               # TypeScript 编译配置
    ├── .env.example                # 环境变量示例
    ├── database/
    │   └── init.sql                # 数据库初始化脚本
    └── src/
        ├── app.ts                  # 应用入口
        ├── config/
        │   └── index.ts            # 配置管理
        ├── types/
        │   └── index.ts            # TypeScript 类型定义
        ├── utils/
        │   ├── database.ts         # 数据库连接池
        │   ├── response.ts         # 响应格式化工具
        │   └── validator.ts        # 数据验证工具
        ├── middleware/
        │   └── auth.ts             # JWT 认证中间件
        ├── services/
        │   ├── userService.ts      # 用户业务逻辑
        │   ├── itemService.ts      # 物品业务逻辑
        │   ├── orderService.ts     # 订单业务逻辑
        │   ├── chatService.ts      # 聊天业务逻辑
        │   ├── resourceService.ts  # 资源共享业务逻辑
        │   └── notificationService.ts  # 通知业务逻辑
        ├── controllers/
        │   ├── userController.ts   # 用户控制器
        │   ├── itemController.ts   # 物品控制器
        │   ├── orderController.ts  # 订单控制器
        │   ├── chatController.ts   # 聊天控制器
        │   ├── resourceController.ts   # 资源控制器
        │   └── notificationController.ts  # 通知控制器
        └── routes/
            ├── index.ts            # 路由汇总
            ├── userRoutes.ts       # 用户路由
            ├── itemRoutes.ts       # 物品路由
            ├── orderRoutes.ts      # 订单路由
            ├── chatRoutes.ts       # 聊天路由
            ├── resourceRoutes.ts   # 资源路由
            ├── notificationRoutes.ts  # 通知路由
            └── reportRoutes.ts     # 举报路由
```

### API 接口概览

> 📖 完整的 API 文档（含请求/响应示例、参数说明）请查看 [API.md](./backend/API.md)

| 模块 | 接口路径 | 说明 |
|------|----------|------|
| 用户 | POST /api/users/register | 用户注册 |
| 用户 | POST /api/users/login | 用户登录 |
| 用户 | GET /api/users/profile | 获取个人信息 |
| 用户 | PUT /api/users/profile | 更新个人信息 |
| 用户 | PUT /api/users/password | 修改密码 |
| 物品 | GET /api/items | 搜索物品 |
| 物品 | POST /api/items | 创建物品 |
| 物品 | GET /api/items/:id | 物品详情 |
| 物品 | PUT /api/items/:id | 更新物品 |
| 物品 | DELETE /api/items/:id | 删除物品 |
| 物品 | POST /api/items/:id/publish | 发布物品 |
| 物品 | POST /api/items/:id/favorite | 收藏物品 |
| 分类 | GET /api/categories | 获取分类列表 |
| 订单 | POST /api/orders | 创建订单 |
| 订单 | GET /api/orders/:id | 订单详情 |
| 订单 | POST /api/orders/:id/pay | 支付订单 |
| 订单 | POST /api/orders/:id/ship | 发货 |
| 订单 | POST /api/orders/:id/complete | 确认收货 |
| 订单 | POST /api/orders/:id/cancel | 取消订单 |
| 订单 | POST /api/orders/:id/review | 评价 |
| 资源 | GET /api/resources | 搜索资源 |
| 资源 | POST /api/resources | 创建资源 |
| 资源 | POST /api/resources/:id/publish | 发布资源 |
| 资源 | POST /api/resources/:id/download | 下载资源 |
| 聊天 | GET /api/chat/sessions | 会话列表 |
| 聊天 | POST /api/chat/messages | 发送消息 |
| 通知 | GET /api/notifications | 通知列表 |
| 举报 | POST /api/reports | 创建举报 |

### 技术架构

- **语言**：TypeScript（严格类型检查）
- **框架**：Express.js
- **数据库**：MySQL 8.0
- **认证**：JWT (JSON Web Token)
- **密码加密**：bcryptjs
- **容器化**：Docker + Docker Compose
- **架构模式**：Controller → Service → Database 三层架构


## 自测流程

以下是完整的功能自测流程，按顺序执行可验证所有核心功能。

### 1. 启动服务

```bash
# 启动所有服务
docker-compose up --build -d

# 等待服务启动完成（约30秒），检查状态
docker-compose ps

# 验证后端服务健康
curl http://localhost:3000/health
# 预期返回: {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 2. 用户模块测试

```bash
# 2.1 注册卖家账号
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"seller001","password":"seller123","email":"seller@test.com"}'

# 2.2 注册买家账号
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"buyer001","password":"buyer123","email":"buyer@test.com"}'

# 2.3 卖家登录（保存返回的 token）
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"seller001","password":"seller123"}'
# 返回示例: {"code":0,"data":{"token":"eyJhbG...","user":{...}}}

# 2.4 设置环境变量（替换为实际返回的 token）
export SELLER_TOKEN="..."

export BUYER_TOKEN="..."  # 同样方式获取买家 token

# 2.5 获取个人信息
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $SELLER_TOKEN"

# 2.6 更新个人信息
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{"real_name":"张三","school":"北京大学","phone":"13800138000"}'
```

### 3. 物品模块测试

```bash
# 3.1 获取分类列表
curl http://localhost:3000/api/categories

# 3.2 卖家创建物品（草稿状态）
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "title":"二手MacBook Pro 2023",
    "description":"M2芯片，16G内存，成色95新",
    "price":8999,
    "original_price":14999,
    "category_id":10,
    "condition_level":"like_new",
    "location":"北京大学宿舍楼"
  }'
# 返回示例: {"code":0,"data":{"id":"xxx-xxx-xxx"}}
# 保存物品ID
export ITEM_ID="xxx-xxx-xxx"

# 3.3 发布物品（上架）
curl -X POST http://localhost:3000/api/items/$ITEM_ID/publish \
  -H "Authorization: Bearer $SELLER_TOKEN"

# 3.4 搜索物品
curl "http://localhost:3000/api/items?keyword=MacBook"

# 3.5 获取物品详情
curl http://localhost:3000/api/items/$ITEM_ID

# 3.6 买家收藏物品
curl -X POST http://localhost:3000/api/items/$ITEM_ID/favorite \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 3.7 获取收藏列表
curl http://localhost:3000/api/items/my/favorites \
  -H "Authorization: Bearer $BUYER_TOKEN"
```

### 4. 交易流程测试

```bash
# 4.1 买家创建订单
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "item_id":"'$ITEM_ID'",
    "delivery_method":"face_to_face",
    "remark":"明天中午12点在食堂门口交易"
  }'
# 保存订单ID
export ORDER_ID="xxx-xxx-xxx"

# 4.2 买家支付订单
curl -X POST http://localhost:3000/api/orders/$ORDER_ID/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"payment_method":"wechat"}'

# 4.3 卖家发货/确认交易
curl -X POST http://localhost:3000/api/orders/$ORDER_ID/ship \
  -H "Authorization: Bearer $SELLER_TOKEN"

# 4.4 买家确认收货

# 4.5 买家评价卖家
curl -X POST http://localhost:3000/api/orders/$ORDER_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"rating":5,"content":"物品和描述一致，卖家很靠谱！"}'

# 4.6 查看订单详情（含评价）
curl http://localhost:3000/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 4.7 查看我的订单列表（买家视角）
curl http://localhost:3000/api/orders/buyer \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 4.8 查看我的订单列表（卖家视角）
curl http://localhost:3000/api/orders/seller \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

### 5. 聊天模块测试

```bash
# 5.1 获取卖家用户ID
SELLER_ID=$(curl -s http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $SELLER_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# 5.2 买家给卖家发消息
curl -X POST http://localhost:3000/api/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"receiver_id":"'$SELLER_ID'","content":"你好，请问还有其他颜色吗？"}'

# 5.3 获取会话列表
curl http://localhost:3000/api/chat/sessions \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 5.4 获取会话消息（替换 SESSION_ID 为实际值）
curl http://localhost:3000/api/chat/sessions/SESSION_ID/messages \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 5.5 获取未读消息数
curl http://localhost:3000/api/chat/unread-count \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

### 6. 资源共享模块测试

```bash
# 6.1 创建共享资源
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "title":"高等数学期末复习资料",
    "description":"包含历年真题和详细解析",
    "resource_type":"document",
    "file_url":"https://example.com/math.pdf",
    "tags":["高数","期末","复习"],
    "is_free":true
  }'

# 6.2 发布资源（创建后需发布才会在搜索中可见）
curl -X POST http://localhost:3000/api/resources/RESOURCE_ID/publish \
  -H "Authorization: Bearer $SELLER_TOKEN"

# 6.3 搜索资源
curl "http://localhost:3000/api/resources?keyword=高数"

# 6.4 下载资源
curl -X POST http://localhost:3000/api/resources/RESOURCE_ID/download \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 6.5 点赞资源
curl -X POST http://localhost:3000/api/resources/RESOURCE_ID/like
```

### 7. 通知和举报测试

```bash
# 7.1 获取通知列表
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 7.2 获取未读通知数
curl http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 7.3 创建举报
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "target_type":"item",
    "target_id":"'$ITEM_ID'",
    "reason":"虚假信息",
    "description":"物品描述与实际不符"
  }'
```

### 8. 清理测试环境

```bash
# 停止服务但保留数据
docker-compose down

# 停止服务并清除所有数据（重新开始）
docker-compose down -v
```

### 预期结果

| 测试项 | 预期结果 |
|--------|----------|
| 健康检查 | 返回 `{"status":"ok"}` |
| 用户注册 | 返回 `code: 0` 和 token |
| 用户登录 | 返回 `code: 0` 和用户信息 |
| 创建物品 | 返回物品 ID |
| 发布物品 | 状态变为 `published` |
| 搜索物品 | 返回匹配的物品列表 |
| 创建订单 | 返回订单 ID，物品变为 `reserved` |
| 支付订单 | 订单状态变为 `paid` |
| 发货 | 订单状态变为 `shipping` |
| 确认收货 | 订单状态变为 `completed`，物品变为 `sold` |
| 评价 | 评价保存成功，卖家信用分增加 |
| 发送消息 | 消息保存成功，创建聊天会话 |
