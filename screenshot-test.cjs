const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait a bit more for client-side rendering
  await page.waitForTimeout(5000);
  
  // Take screenshot of the full page
  await page.screenshot({ path: 'screenshot-home.png', fullPage: false });
  console.log('Screenshot saved as screenshot-home.png');
  
  // Also get the page title and any text content
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check what's visible on the page
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Body text (first 2000 chars):', bodyText);
  
  // Check if header contains "管理后台" or "支付通道" or "方案"
  const headerText = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.innerText : 'no header found';
  });
  console.log('Header text:', headerText);
  
  await browser.close();
})();
