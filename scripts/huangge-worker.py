#!/usr/bin/env python3
"""
「和荒哥聊聊」LiveKit Worker
============================
启动：  python huangge-worker.py

架构：
  浏览器 → WebRTC → LiveKit Server → 本 Worker
                                        ├── Deepgram STT
                                        ├── Vercel /api/ai/fengge-chat (LLM)
                                        └── Vercel /api/ai/fengge-voice (TTS→MiMo)
  全部复用本项目已有的 API Key + 模型配置。
"""

import asyncio
import json
import os
import time
import urllib.request

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, silero

VERCEL_BASE = os.getenv("VERCEL_BASE", "https://hgsdy.cn")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")


def _call_vercel(path: str, body: dict) -> dict | None:
    """调 Vercel API"""
    url = f"{VERCEL_BASE}{path}?_t={int(time.time())}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[vercel] {path} error: {e}", flush=True)
        return None


class HuanggeAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="你是荒哥，电影解说创作导师。",
            stt=deepgram.STT(model="nova-2", language="zh", api_key=DEEPGRAM_API_KEY),
            tts=silero.TTS(),  # 占位 TTS（实际用 Vercel）
            vad=silero.VAD.load(),
        )

    async def on_enter(self):
        """用户进入会话"""
        print("[agent] 用户已连接", flush=True)

    async def llm_node(self, text: str):
        """LLM：调 Vercel"""
        result = _call_vercel("/api/ai/fengge-chat", {
            "message": text,
            "history": [],
        })
        return (result or {}).get("answer", "")

    async def tts_node(self, text: str):
        """TTS：调 Vercel → MiMo，返回音频 bytes"""
        result = _call_vercel("/api/ai/fengge-voice", {"text": text})
        # fengge-voice 返回 audio/wav 二进制
        if result and "error" in result:
            print(f"[tts] error: {result['error']}", flush=True)
            return None
        return result

    async def say(self, text: str):
        """播报文字（通过 Vercel TTS）"""
        audio_data = await self.tts_node(text)
        if audio_data:
            # 将 WAV 字节发布为音频轨道
            await self.publish_audio(audio_data, sample_rate=24000)


async def entrypoint(job: JobContext) -> None:
    print(f"[worker] 加入房间: {job.room.name}", flush=True)
    await job.connect()

    agent = HuanggeAgent()
    session = AgentSession(agent=agent, vad=silero.VAD.load())
    await session.start(room=job.room, agent_name="huangge")
    print(f"[worker] 对话就绪", flush=True)


def main():
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="huangge",
    ))


if __name__ == "__main__":
    main()
