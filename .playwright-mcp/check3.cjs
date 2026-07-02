const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);

  // Check nav button heights
  const navInfo = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return 'NO NAV';
    return Array.from(nav.querySelectorAll('button')).map(btn => {
      const r = btn.getBoundingClientRect();
      return {
        text: btn.textContent?.trim(),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
  });
  console.log('NAV BUTTONS:', JSON.stringify(navInfo));

  // Check header right-side buttons
  const rightBtns = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return [];
    const allBtns = header.querySelectorAll('button');
    return Array.from(allBtns).filter(b => {
      const nav = b.closest('nav');
      return !nav; // only non-nav buttons
    }).map(b => {
      const r = b.getBoundingClientRect();
      return {
        text: b.textContent?.trim().substring(0, 20),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
  });
  console.log('RIGHT BUTTONS:', JSON.stringify(rightBtns));

  // Check for genuinely wrapped text (excluding badges and clamped text)
  const realWrapped = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('p, div, span, h1, h2, h3, button, a').forEach(el => {
      const text = el.textContent?.trim();
      if (!text || text.length < 3 || text.length > 40) return;
      // Skip badges (they have their own nowrap)
      if (el.classList.contains('inline-flex') && el.tagName === 'SPAN') return;
      // Skip clamped text
      if (el.classList.contains('line-clamp-1') || el.classList.contains('line-clamp-2') || el.classList.contains('line-clamp-3')) return;
      
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      
      // Check if direct text wraps
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent?.trim())
        .join('');
      
      if (directText.length > 2 && directText.length < 30 && rects.length > 1) {
        const elRect = el.getBoundingClientRect();
        const styles = getComputedStyle(el);
        results.push({
          tag: el.tagName,
          text: directText,
          lines: rects.length,
          width: Math.round(elRect.width),
          whiteSpace: styles.whiteSpace,
          cls: (el.className || '').toString().substring(0, 80),
        });
      }
    });
    return results.slice(0, 15);
  });
  console.log('REAL WRAPPED TEXT:', JSON.stringify(realWrapped, null, 2));

  await browser.close();
})();
