#!/usr/bin/env bash
# ==========================================================
# 「和荒哥聊聊」腾讯云一键安装脚本
# 适用：Ubuntu 20.04+ / Debian 11+
# 用法：bash install.sh
# ==========================================================
set -euo pipefail

LIVEKIT_VERSION="1.8.7"
SERVER_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "YOUR_SERVER_IP")
WORKER_DIR="$HOME/huangge-worker"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "========================================"
echo "  和荒哥聊聊 · 腾讯云一键安装"
echo "========================================"
echo -e "${NC}"

# ── 1. 系统依赖 ──
echo -e "\n${YELLOW}[1/6] 安装系统依赖${NC}"
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget python3 python3-pip python3-venv git unzip
echo -e "  ${GREEN}✓${NC}"

# ── 2. 下载 LiveKit Server ──
echo -e "\n${YELLOW}[2/6] 下载 LiveKit Server v${LIVEKIT_VERSION}${NC}"
if command -v livekit-server &>/dev/null; then
  echo -e "  ${GREEN}✓ 已安装: $(livekit-server --version)${NC}"
else
  wget -q -O /tmp/livekit.tar.gz \
    "https://github.com/livekit/livekit/releases/download/v${LIVEKIT_VERSION}/livekit_${LIVEKIT_VERSION}_linux_amd64.tar.gz"
  sudo tar -xzf /tmp/livekit.tar.gz -C /usr/local/bin/ livekit-server
  rm /tmp/livekit.tar.gz
  echo -e "  ${GREEN}✓ LiveKit Server v${LIVEKIT_VERSION}${NC}"
fi

# ── 3. 创建 worker 目录 + 下载脚本 ──
echo -e "\n${YELLOW}[3/6] 创建 worker${NC}"
mkdir -p "$WORKER_DIR"
cd "$WORKER_DIR"

# 下载 huangge-worker.py（从 GitHub raw 或本地复制）
WORKER_URL="https://raw.githubusercontent.com/YeJe-cpu/talk-to-fengge/main/scripts/huangge-worker.py"
if wget -q -O huangge-worker.py "$WORKER_URL" 2>/dev/null; then
  echo -e "  ${GREEN}✓ worker 已下载${NC}"
else
  # 如果下载失败，手动创建
  echo -e "  ${YELLOW}⚠ 从 GitHub 下载失败，稍后复制${NC}"
fi

# ── 4. 安装 Python 依赖 ──
echo -e "\n${YELLOW}[4/6] 安装 Python 依赖${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q livekit-agents livekit-plugins-deepgram livekit-plugins-silero
echo -e "  ${GREEN}✓ Python 依赖${NC}"

# ── 5. 创建环境变量文件 ──
echo -e "\n${YELLOW}[5/6] 配置环境变量${NC}"
if [ ! -f .env ]; then
  cat > .env << EOF
# ── 语音识别（STT）：必需 ──
# Deepgram（免费，推荐）
# 注册：https://deepgram.com → Get API Key
DEEPGRAM_API_KEY=你的Deepgram_API_Key

# ── Vercel 地址 ──
VERCEL_BASE=https://hgsdy.cn
EOF
  echo -e "  ${YELLOW}⚠ 请编辑 $WORKER_DIR/.env 填入 DEEPGRAM_API_KEY${NC}"
else
  echo -e "  ${GREEN}✓ .env 已存在${NC}"
fi

# ── 6. 创建启动/停止脚本 ──
echo -e "\n${YELLOW}[6/6] 创建管理脚本${NC}"

# 启动脚本
cat > start.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
source .venv/bin/activate
set -a; source .env; set +a
echo "[和荒哥聊聊] 启动 LiveKit Server..."
livekit-server --dev --node-ip=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "127.0.0.1") &
sleep 2
echo "[和荒哥聊聊] 启动 Worker..."
python huangge-worker.py
SCRIPT
chmod +x start.sh

# 停止脚本
cat > stop.sh << 'SCRIPT'
#!/usr/bin/env bash
echo "[和荒哥聊聊] 停止服务..."
pkill -f livekit-server 2>/dev/null || true
pkill -f huangge-worker.py 2>/dev/null || true
echo "[和荒哥聊聊] 已停止"
SCRIPT
chmod +x stop.sh

echo -e "  ${GREEN}✓ start.sh / stop.sh${NC}"

# ── 完成 ──
echo -e "\n${GREEN}========================================"
echo "  ✅ 安装完成！"
echo "========================================"
echo -e "${NC}"
echo -e "  服务器 IP: ${RED}$SERVER_IP${NC}"
echo ""
echo -e "  ${YELLOW}★ 第一步：填写 API Key${NC}"
echo "    nano $WORKER_DIR/.env"
echo "    填入 DEEPGRAM_API_KEY"
echo ""
echo -e "  ${YELLOW}★ 第二步：防火墙开端口${NC}"
echo "    腾讯云 → 安全组 → 添加入站规则："
echo "    TCP 7880   源: 0.0.0.0/0"
echo "    UDP 50000-60000  源: 0.0.0.0/0"
echo ""
echo -e "  ${YELLOW}★ 第三步：启动服务${NC}"
echo "    cd $WORKER_DIR && bash start.sh"
echo ""
echo -e "  ${YELLOW}★ 第四步：Vercel 环境变量${NC}"
echo "    在 Vercel 后台添加："
echo "    LIVEKIT_URL     ws://${SERVER_IP}:7880"
echo "    LIVEKIT_API_KEY devkey"
echo "    LIVEKIT_API_SECRET secret"
echo ""
echo -e "  ${YELLOW}★ 第五步：访问${NC}"
echo "    https://hgsdy.cn → 导航 → 和荒哥聊聊"
echo ""

# 使用提示
if [ ! -f .env ] || grep -q "你的Deepgram_API_Key" .env 2>/dev/null; then
  echo -e "  ${RED}⚠ 还没填 API Key！编辑 .env 后启动${NC}"
fi
