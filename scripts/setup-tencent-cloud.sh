#!/usr/bin/env bash
# ===================================================
# 「和荒哥聊聊」— 腾讯云服务器一键部署脚本
# 适用：Ubuntu 20.04+ / Debian 11+
# ===================================================
set -euo pipefail

# ── 配置（按需修改）──
LIVEKIT_VERSION="1.8.7"
LIVEKIT_PORT=7880
LIVEKIT_TCP_PORT=7881
LIVEKIT_UDP_START=50000
LIVEKIT_UDP_END=60000
WORKER_DIR="$HOME/talk-to-fengge-worker"

echo "========================================"
echo "  和荒哥聊聊 · 腾讯云部署"
echo "========================================"

# ── 1. 安装系统依赖 ──
echo "[1/6] 安装系统依赖..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget python3 python3-pip python3-venv git unzip

# ── 2. 下载 LiveKit Server ──
echo "[2/6] 下载 LiveKit Server v${LIVEKIT_VERSION}..."
LIVEKIT_BIN="/usr/local/bin/livekit-server"
if [ ! -f "$LIVEKIT_BIN" ]; then
  LK_URL="https://github.com/livekit/livekit/releases/download/v${LIVEKIT_VERSION}/livekit_${LIVEKIT_VERSION}_linux_amd64.tar.gz"
  wget -q -O /tmp/livekit.tar.gz "$LK_URL"
  sudo tar -xzf /tmp/livekit.tar.gz -C /usr/local/bin/ livekit-server
  rm /tmp/livekit.tar.gz
  echo "  ✓ LiveKit Server 已安装"
else
  echo "  ✓ LiveKit Server 已存在"
fi

# ── 3. 创建 worker 目录 ──
echo "[3/6] 准备 Python worker..."
mkdir -p "$WORKER_DIR"

# ── 4. 克隆 talk-to-fengge 源码 ──
echo "[4/6] 克隆 talk-to-fengge..."
if [ -d "$WORKER_DIR/.git" ]; then
  echo "  ✓ 源码已存在，更新中..."
  cd "$WORKER_DIR" && git pull
else
  git clone https://github.com/YeJe-cpu/talk-to-fengge.git "$WORKER_DIR"
fi

# ── 5. 配置环境变量 ──
echo "[5/6] 配置环境变量..."
cd "$WORKER_DIR"

# 复制 env 模板
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo ""
  echo "  ⚠ 请编辑 $WORKER_DIR/.env.local"
  echo "    填入你的 API Key（STT / LLM / TTS）"
  echo "    目前支持："
  echo "      STT  → cartesia / deepgram / gemini"
  echo "      LLM  → minimax / deepseek / gemini"
  echo "      TTS  → cartesia / minimax / moss / voxcpm"
  echo ""
  echo "  🔑 LiveKit 默认使用 devkey/secret（本地模式）"
else
  echo "  ✓ .env.local 已存在"
fi

# ── 6. 安装 Python 依赖 ──
echo "[6/6] 安装 Python 依赖..."
cd "$WORKER_DIR"

# 尝试使用 uv（更快），回落 pip
if command -v uv &>/dev/null; then
  uv sync
else
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r pyproject.toml 2>/dev/null || pip install livekit-agents livekit-plugins-cartesia
fi

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
echo ""
echo "  ★ 启动流程："
echo ""
echo "  终端 1 — LiveKit Server："
echo "    livekit-server --dev --node-ip=43.156.242.177"
echo ""
echo "  终端 2 — Python Worker："
echo "    cd $WORKER_DIR"
echo "    source .venv/bin/activate  # (如果用 pip)"
echo "    LLM_PROVIDER=minimax python -m worker.main"
echo ""
echo "  终端 3 — Web Server（可选）："
echo "    python -m worker.web_server"
echo ""
echo "  ★ 防火墙开端口："
echo "    sudo ufw allow $LIVEKIT_PORT/tcp"
echo "    sudo ufw allow $LIVEKIT_TCP_PORT/tcp"
echo "    sudo ufw allow ${LIVEKIT_UDP_START}:${LIVEKIT_UDP_END}/udp"
echo ""
echo "  ★ Vercel 环境变量配置："
echo "    LIVEKIT_URL=ws://43.156.242.177:$LIVEKIT_PORT"
echo "    LIVEKIT_API_KEY=devkey"
echo "    LIVEKIT_API_SECRET=secret"
echo ""
echo "========================================"
