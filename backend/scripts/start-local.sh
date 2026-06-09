#!/bin/bash

# =====================================================
# 本地开发环境启动脚本
# 用于不使用 Docker 的本地开发环境
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  校园二手物品交易平台 - 本地启动脚本  ${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Node.js 是否安装
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        echo "请先安装 Node.js >= 18.0"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}警告: Node.js 版本建议 >= 18.0，当前版本: $(node -v)${NC}"
    else
        echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
    fi
}

# 检查 MySQL 是否运行
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        echo -e "${YELLOW}警告: MySQL 客户端未安装，无法自动检查数据库状态${NC}"
        return
    fi

    echo -e "${YELLOW}请确保 MySQL 服务已启动并可连接${NC}"
}

# 安装依赖
install_dependencies() {
    echo ""
    echo -e "${GREEN}[1/4] 安装后端依赖...${NC}"
    cd "$BACKEND_DIR"

    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "node_modules 已存在，跳过安装（如需重新安装请删除 node_modules 文件夹）"
    fi
}

# 配置环境变量
setup_env() {
    echo ""
    echo -e "${GREEN}[2/4] 配置环境变量...${NC}"
    cd "$BACKEND_DIR"

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${YELLOW}已从 .env.example 创建 .env 文件${NC}"
            echo -e "${YELLOW}请根据实际情况修改 .env 中的数据库配置${NC}"
        else
            # 创建默认 .env 文件
            cat > .env << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_trade

# JWT配置
JWT_SECRET=your_jwt_secret_key_for_local_dev
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=development
EOF
            echo -e "${YELLOW}已创建默认 .env 文件，请修改数据库密码等配置${NC}"
        fi
    else
        echo ".env 文件已存在"
    fi
}

# 初始化数据库
init_database() {
    echo ""
    echo -e "${GREEN}[3/4] 数据库初始化提示...${NC}"
    echo -e "${YELLOW}请确保已完成以下步骤:${NC}"
    echo "  1. MySQL 服务已启动"
    echo "  2. 已创建数据库: campus_trade"
    echo "  3. 已导入初始化脚本: backend/database/init.sql"
    echo ""
    echo "可以使用以下命令初始化数据库:"
    echo -e "  ${GREEN}mysql -u root -p < backend/database/init.sql${NC}"
    echo ""
}

# 编译并启动服务
start_server() {
    echo ""
    echo -e "${GREEN}[4/4] 启动后端服务...${NC}"
    cd "$BACKEND_DIR"

    # 加载 .env 文件
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    echo "编译 TypeScript..."
    npm run build

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  启动服务中...${NC}"
    echo -e "${GREEN}  API 地址: http://localhost:${PORT:-3000}${NC}"
    echo -e "${GREEN}  健康检查: http://localhost:${PORT:-3000}/health${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    npm run start
}

# 开发模式启动（热重载）
start_dev() {
    echo ""
    echo -e "${GREEN}[4/4] 以开发模式启动后端服务...${NC}"
    cd "$BACKEND_DIR"

    # 加载 .env 文件
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  以开发模式启动服务中...${NC}"
    echo -e "${GREEN}  API 地址: http://localhost:${PORT:-3000}${NC}"
    echo -e "${GREEN}  健康检查: http://localhost:${PORT:-3000}/health${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    npm run dev
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --dev       以开发模式启动（使用 ts-node，支持热重载）"
    echo "  --prod      以生产模式启动（先编译再运行）"
    echo "  --install   仅安装依赖"
    echo "  --help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 默认以生产模式启动"
    echo "  $0 --dev        # 以开发模式启动"
    echo "  $0 --install    # 仅安装依赖"
}

# 主流程
main() {
    check_node
    check_mysql

    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --install)
            install_dependencies
            setup_env
            echo -e "${GREEN}依赖安装完成！${NC}"
            exit 0
            ;;
        --dev)
            install_dependencies
            setup_env
            init_database
            start_dev
            ;;
        --prod|"")
            install_dependencies
            setup_env
            init_database
            start_server
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
