const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/', {
    waitUntil: 'networkidle2',
    timeout: 15000,
  });

  // wait for app ready hook if available
  try {
    await page.waitForFunction('window.__appReady === true', {
      timeout: 10000,
    });
  } catch (e) {
    // proceed even if the hook didn't appear
  }

  // If the targets panel is not present, try programmatic activation of the settings view
  const hasTargets = await page.$('#targets-panel');
  if (!hasTargets) {
    // prefer using exposed dispatch if available
    const dispatched = await page.evaluate(() => {
      if (window && window.__dispatch) {
        try {
          window.__dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'settings' });
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    if (dispatched) {
      try {
        await page.waitForSelector('#targets-panel', { timeout: 10000 });
      } catch (e) {
        // still continue to dump DOM even if not found
      }
    }
  }

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('cypress/results/dumped_dom_settings.html', html, 'utf8');
  console.log('WROTE_SETTINGS');
  await browser.close();
})();
