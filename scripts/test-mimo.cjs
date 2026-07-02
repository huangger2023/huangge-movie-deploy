// 测试 MiMo TTS API
// 运行: MIMO_API_KEY=your_key node scripts/test-mimo.cjs

require('dotenv').config({ path: '.env.local' });

const MIMO_API_KEY = process.env.MIMO_API_KEY || process.env.MIMO_API_KEY;
const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";

if (!MIMO_API_KEY) {
  console.error("请设置 MIMO_API_KEY 环境变量");
  process.exit(1);
}

const voices = ["Chloe", "alloy", "echo", "fable", "onyx", "nova", "shimmer"];

async function testVoice(voice) {
  console.log(`\n测试音色: ${voice}`);
  try {
    const res = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": MIMO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mimo-v2.5-tts",
        messages: [
          { role: "user", content: "" },
          { role: "assistant", content: "测试语音" }
        ],
        audio: { format: "wav", voice },
        stream: false,
      }),
    });
    
    console.log(`  状态码: ${res.status}`);
    const text = await res.text();
    
    if (res.ok) {
      console.log(`  ✅ 成功! 响应长度: ${text.length} bytes`);
    } else {
      console.log(`  ❌ 失败: ${text.slice(0, 300)}`);
    }
  } catch (e) {
    console.log(`  ❌ 异常: ${e.message}`);
  }
}

async function main() {
  console.log("开始测试 MiMo TTS API...");
  console.log(`端点: ${MIMO_ENDPOINT}`);
  
  for (const voice of voices) {
    await testVoice(voice);
    await new Promise(r => setTimeout(r, 500)); // 避免太快
  }
}

main();
