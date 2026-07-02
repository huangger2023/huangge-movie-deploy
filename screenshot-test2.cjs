const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Clear localStorage to remove any stale state
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Screenshot before login
  await page.screenshot({ path: 'screenshot-before-login.png' });
  console.log('=== Before login ===');
  const headerBefore = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.innerText : 'no header found';
  });
  console.log('Header:', headerBefore);

  // Login as admin
  // Click "登录 / 注册" button
  const loginBtn = await page.locator('text=登录 / 注册').first();
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(2000);

    // Fill in the login form
    await page.fill('input[type="email"]', 'admin@huangge.com');
    await page.fill('input[type="password"]', 'huangge2024');
    
    // Click login button
    await page.locator('button:has-text("登录")').last().click();
    await page.waitForTimeout(3000);

    // Screenshot after login
    await page.screenshot({ path: 'screenshot-after-login.png' });
    console.log('\n=== After login ===');
    const headerAfter = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.innerText : 'no header found';
    });
    console.log('Header:', headerAfter);
    
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Body text (first 500):', bodyText);
  } else {
    console.log('Login button not found');
  }
  
  await browser.close();
})();
