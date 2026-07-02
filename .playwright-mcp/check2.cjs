const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);

  // Check nav items
  const navItems = await page.evaluate(() => {
    const navEl = document.querySelector('nav');
    if (!navEl) return 'NO NAV';
    const items = navEl.querySelectorAll('button');
    return Array.from(items).map(btn => {
      const r = btn.getBoundingClientRect();
      const styles = getComputedStyle(btn);
      return {
        text: btn.textContent?.trim(),
        width: Math.round(r.width),
        height: Math.round(r.height),
        whiteSpace: styles.whiteSpace,
        flexWrap: styles.flexWrap,
      };
    });
  });
  console.log('NAV ITEMS:', JSON.stringify(navItems, null, 2));

  // Check header layout
  const headerInfo = await page.evaluate(() => {
    const h = document.querySelector('header');
    if (!h) return 'NO HEADER';
    const hr = h.getBoundingClientRect();
    const inner = h.querySelector('div');
    const innerR = inner ? inner.getBoundingClientRect() : null;
    return {
      headerWidth: Math.round(hr.width),
      innerWidth: innerR ? Math.round(innerR.width) : 0,
    };
  });
  console.log('HEADER:', JSON.stringify(headerInfo, null, 2));

  // Check hero h1
  const heroInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return 'NO H1';
    const r = h1.getBoundingClientRect();
    const styles = getComputedStyle(h1);
    return {
      text: h1.textContent?.trim(),
      width: Math.round(r.width),
      height: Math.round(r.height),
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      maxWidth: styles.maxWidth,
    };
  });
  console.log('H1:', JSON.stringify(heroInfo, null, 2));

  // Check for elements where text wraps awkwardly
  const wrappedTexts = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('button, a, span, h1, h2, h3, p').forEach(el => {
      const text = el.textContent?.trim();
      if (!text || text.length < 3 || text.length > 50) return;
      // Check if this element's text is split across multiple lines
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      if (rects.length > 1) {
        const elRect = el.getBoundingClientRect();
        // Only report if the text itself wraps (not just child elements)
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent?.trim())
          .join('');
        if (directText.length > 2 && directText.length < 30) {
          results.push({
            tag: el.tagName,
            text: directText,
            lineCount: rects.length,
            width: Math.round(elRect.width),
            classes: (el.className || '').toString().substring(0, 100),
          });
        }
      }
    });
    return results.slice(0, 30);
  });
  console.log('WRAPPED TEXTS:', JSON.stringify(wrappedTexts, null, 2));

  await browser.close();
})();
