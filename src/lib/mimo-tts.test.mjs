// MiMo TTS v8 端点测试
// 端点已从 v1 更新到 v8

const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v8/chat/completions";
const MIMO_API_KEY = process.env.MIMO_API_KEY;

if (!MIMO_API_KEY) {
  console.error("请设置 MIMO_API_KEY 环境变量");
  process.exit(1);
}

// 测试 preset 模式
async function testPreset() {
  console.log("测试 preset 模式...");
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
        { role: "assistant", content: "你好，我是荒哥，欢迎来到电影解说课堂。" }
      ],
      audio: { format: "wav", voice: "Chloe" },
      stream: false,
    }),
  });
  
  console.log(`状态码: ${res.status}`);
  const text = await res.text();
  console.log(`响应: ${text.slice(0, 500)}`);
  
  if (res.ok) {
    const data = JSON.parse(text);
    console.log("✅ 成功! 响应包含音频数据");
  } else {
    console.log("❌ 失败");
  }
}

// 测试所有音色
async function testAllVoices() {
  const voices = ["Chloe", "alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  
  for (const voice of voices) {
    console.log(`\n测试音色: ${voice}`);
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
    if (res.ok) {
      console.log(`  ✅ ${voice} 可用`);
    } else {
      const text = await res.text();
      console.log(`  ❌ ${text.slice(0, 200)}`);
    }
  }
}

testAllVoices().catch(console.error);
