const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(6000);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800));
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const hasSpinner = await page.evaluate(() => !!document.querySelector('.animate-spin'));
  const hasHeader = await page.evaluate(() => !!document.querySelector('header'));
  const mainContent = await page.evaluate(() => {
    const main = document.querySelector('main');
    return main ? main.innerText.substring(0, 300) : 'NO MAIN ELEMENT';
  });

  console.log('=== PAGE DIAGNOSTICS ===');
  console.log('Title:', title);
  console.log('Body Width:', bodyWidth);
  console.log('Body Height:', bodyHeight);
  console.log('Has Loading Spinner:', hasSpinner);
  console.log('Has Header:', hasHeader);
  console.log('Main Content:', mainContent);
  console.log('Body Text (first 800 chars):', bodyText);
  console.log('Errors:', errors.length > 0 ? JSON.stringify(errors, null, 2) : 'NONE');

  await page.screenshot({ path: 'd:\\Hgdev\\荒哥独选\\.playwright-mcp\\full-page.png', fullPage: true });
  console.log('Screenshot saved to .playwright-mcp/full-page.png');

  await browser.close();
})();
