#!/bin/sh
# =====================================================
# 等待 MySQL 数据库就绪后再启动后端服务
# 通过循环尝试连接数据库，直到成功或超时
# =====================================================

set -e

HOST="$1"
PORT="$2"
shift 2
CMD="$@"

echo "等待数据库 $HOST:$PORT 就绪..."

# 最多等待60秒
MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # 尝试通过 TCP 连接数据库端口
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "数据库已就绪，启动后端服务..."
    # 额外等待几秒，确保 MySQL 完全初始化
    sleep 3
    exec $CMD
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "数据库未就绪，等待中... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

echo "等待数据库超时，强制启动..."
exec $CMD
