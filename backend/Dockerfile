# =====================================================
# 校园二手物品交易与资源共享平台 - 后端 Dockerfile
# 使用多阶段构建：先编译 TypeScript，再运行
# 基础镜像选用 node:18-alpine，支持 ARM64 和 X86_64
# =====================================================

# ---------- 阶段1：编译阶段 ----------
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 先复制 package.json 安装依赖（利用 Docker 缓存层）
COPY package.json ./

# 安装所有依赖（包括 devDependencies，因为编译需要 typescript）
RUN npm install

# 复制源代码
COPY tsconfig.json ./
COPY src/ ./src/

# 编译 TypeScript -> JavaScript
RUN npm run build

# ---------- 阶段2：运行阶段 ----------
FROM node:18-alpine AS runner

# 设置工作目录
WORKDIR /app

# 只复制 package.json 并安装生产依赖
COPY package.json ./
RUN npm install --omit=dev

# 从编译阶段复制编译产物
COPY --from=builder /app/dist ./dist

# 复制数据库初始化脚本（供参考）
COPY database/ ./database/

# 复制等待数据库脚本
COPY wait-for-db.sh ./wait-for-db.sh
RUN chmod +x ./wait-for-db.sh

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/app.js"]
