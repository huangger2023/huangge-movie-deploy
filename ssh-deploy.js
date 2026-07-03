const { Client } = require("ssh2");
const { execSync } = require("child_process");
const path = require("path");

const HOST = "43.156.242.177";
const USER = "hgsdy2023";
const PASSWORD = "hgsdy2023@";
const PROJECT_DIR = "/home/hgsdy2023/huangge-movie";

const conn = new Client();

conn.on("ready", () => {
  console.log("✅ SSH 连接成功");
  runCommands();
});

conn.on("error", (err) => {
  console.error("❌ SSH 连接失败:", err.message);
  process.exit(1);
});

function exec(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`  $ ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = "";
      stream
        .on("close", (code) => {
          if (code !== 0) console.log(`  ⚠️  exit code: ${code}`);
          resolve(output);
        })
        .on("data", (data) => {
          output += data.toString();
        })
        .stderr.on("data", (data) => {
          process.stdout.write(data.toString());
        });
    });
  });
}

async function runCommands() {
  try {
    // 1. Check environment
    console.log("\n📋 检查环境...");
    const nodeVer = await exec("node --version 2>/dev/null || echo 'not installed'");
    const npmVer = await exec("npm --version 2>/dev/null || echo 'not installed'");
    const nginxVer = await exec("nginx -v 2>&1 || echo 'not installed'");
    console.log(`  Node: ${nodeVer.trim()}`);
    console.log(`  npm: ${npmVer.trim()}`);
    console.log(`  Nginx: ${nginxVer.trim()}`);

    // 2. Install Node.js if not present
    if (nodeVer.includes("not installed")) {
      console.log("\n📦 安装 Node.js...");
      await exec("curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -");
      await exec("sudo apt-get install -y nodejs");
      console.log("  ✅ Node.js 已安装");
    }

    // 3. Clone or pull project
    console.log("\n📂 准备项目...");
    const hasDir = await exec(`test -d ${PROJECT_DIR} && echo 'exists' || echo 'not exists'`);
    if (hasDir.trim() === "exists") {
      await exec(`cd ${PROJECT_DIR} && git pull`);
      console.log("  ✅ 项目已更新");
    } else {
      await exec(`git clone https://github.com/huangger2023/huangge-movie-deploy.git ${PROJECT_DIR}`);
      console.log("  ✅ 项目已克隆");
    }

    // 4. Copy .env.local with config
    console.log("\n🔧 配置环境变量...");
    const envContent = [
      "# Created by deploy script",
      `BROWSER_USE_API_KEY=bu_PksFPedNmcS64tjrc9jZLZm4WuvWAEBEujuRaUcKtZE`,
      `HINDSIGHT_API_KEY=hsk_553264b14072069f607ba718f77c70b9_0ec0511133964c77`,
      `TAVILY_API_KEY=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`,
      `TINYFISH_API_KEY=sk-tinyfish-aWB2fQ4ipCC0bYb0zvz1kVR5vPNiKQLP`,
      `MIMO_API_KEY=sk-cyroy8wuzu6xz7lsm7mcjn9cxlia13cznt9pfr1kviog3en2`,
      `DEEPGRAM_API_KEY=521fb0635f0fc230f4d00bc7ed5609d647f7d5ac`,
      `DATABASE_URL=file:./db/custom.db`,
    ].join("\n");
    await exec(`cat > ${PROJECT_DIR}/.env.local << 'ENVEOF'\n${envContent}\nENVEOF`);
    // Create .env with DATABASE_URL for Prisma
    await exec(`echo "DATABASE_URL=file:./db/custom.db" > ${PROJECT_DIR}/.env`);
    console.log("  ✅ 环境变量已配置");

    // 5. Install dependencies
    console.log("\n📦 安装依赖...");
    await exec(`cd ${PROJECT_DIR} && npm install`);
    console.log("  ✅ 依赖已安装");

    // 6. Sync database
    console.log("\n🗄️ 初始化数据库...");
    await exec(`cd ${PROJECT_DIR} && npx prisma db push --skip-generate`);
    console.log("  ✅ 数据库已同步");

    // 7. Build
    console.log("\n🔨 构建项目...");
    await exec(`cd ${PROJECT_DIR} && npm run build`);
    console.log("  ✅ 构建完成");

    // 8. Install PM2
    console.log("\n⚙️ 配置 PM2...");
    await exec("sudo npm install -g pm2");
    await exec(`cd ${PROJECT_DIR} && pm2 delete huangge-movie 2>/dev/null; pm2 start npm --name huangge-movie -- start`);
    await exec("pm2 save");
    await exec("sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u hgsdy2023 --hp /home/hgsdy2023");
    console.log("  ✅ PM2 已配置");

    // 9. Configure Nginx
    console.log("\n🌐 配置 Nginx...");
    const nginxConfig = `
server {
    listen 80;
    server_name hgsdy.cn www.hgsdy.cn 43.156.242.177;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
`;
    await exec(`sudo tee /etc/nginx/sites-available/huangge-movie > /dev/null << 'NGINXEOF'\n${nginxConfig}\nNGINXEOF`);
    await exec("sudo ln -sf /etc/nginx/sites-available/huangge-movie /etc/nginx/sites-enabled/ 2>/dev/null");
    await exec("sudo nginx -t && sudo systemctl reload nginx");
    console.log("  ✅ Nginx 已配置");

    // 10. Setup SSL
    console.log("\n🔒 配置 SSL...");
    await exec("sudo apt-get install -y snapd 2>/dev/null");
    await exec("sudo snap install core; sudo snap refresh core");
    await exec("sudo snap install --classic certbot 2>/dev/null");
    await exec("sudo ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null");
    await exec("sudo certbot --nginx -d hgsdy.cn -d www.hgsdy.cn --non-interactive --agree-tos --email hglp2022@gmail.com || echo 'SSL needs manual config'");
    console.log("  ✅ SSL 已配置（或已跳过）");

    console.log("\n🎉 全部完成！应用已在 http://43.156.242.177 运行");
    console.log("   执行完毕后请修改 DNS: hgsdy.cn → 43.156.242.177");
    
    conn.end();
  } catch (err) {
    console.error("❌ 部署失败:", err.message);
    conn.end();
    process.exit(1);
  }
}

conn.connect({
  host: HOST,
  username: USER,
  password: PASSWORD,
  readyTimeout: 10000,
});
