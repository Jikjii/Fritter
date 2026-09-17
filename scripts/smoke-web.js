/**
 * Browser smoke test for the web export. Walks onboarding → paywall (mock purchase) → Discover →
 * detail → claim form → PDF page → Wallet → Forms → Profile and asserts the honest numbers.
 *
 *   npm run export:web && (cd dist && python3 -m http.server 8765 &) && npm run smoke:web
 *
 * Needs Playwright (npm i -g playwright && npx playwright install chromium) or CHROME_PATH.
 */
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const results = [];
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
  );
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 300)));

  const shot = (name) =>
    page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }).catch(() => {});
  const step = async (name, fn) => {
    try {
      await fn();
      results.push(['PASS', name]);
    } catch (e) {
      results.push([
        'FAIL',
        name,
        String(e.message || e)
          .split('\n')[0]
          .slice(0, 200),
      ]);
      await shot('FAIL-' + name.replace(/\W+/g, '_'));
    }
  };
  const vis = (text) => page.getByText(text, { exact: false }).filter({ visible: true }).first();
  const click = async (text) => {
    const el = vis(text);
    await el.waitFor({ timeout: 8000 });
    await el.click();
  };
  const see = async (text) => {
    await vis(text).waitFor({ timeout: 8000 });
  };

  await step('load → onboarding hook', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await see('Crunchyroll settled for $16,000,000');
    await shot('01-hook1');
  });
  await step('hook2 stat cards', async () => {
    await click('Show me what I');
    await see('You paid for the sub');
    await see('Up to $33.66');
    await shot('02-hook2');
  });
  await step('fan type multi', async () => {
    await click('Check my claims');
    await see('What kind of fan are you');
    await click('Anime watcher');
    await click('Cosplayer');
    await click('Streamer / content creator');
    await click('Continue');
  });
  await step('country single auto-advance', async () => {
    await see('Where do you live');
    await click('United States');
    await see('EVER had an account');
  });
  await step('services multi', async () => {
    await click('Crunchyroll');
    await click('PlayStation Network');
    await click('Amazon Prime');
    await click('Twitch');
    await click('Continue');
  });
  await step('amazon notice (conditional)', async () => {
    await see('Did Amazon send you a Prime refund claim notice');
    await click('Not sure');
  });
  await step('shops', async () => {
    await see('Where do you buy merch');
    await click('Hot Topic');
    await click('Continue');
  });
  await step('purchases', async () => {
    await see('Any of these apply');
    await click('Bought digital games on PlayStation Store');
    await click('Continue');
  });
  await step('con life', async () => {
    await see('Has con life ever cost you money');
    await click('An airline lost, delayed or crushed my bag');
    await click('Continue');
  });
  await step('pay methods', async () => {
    await see('How do you usually pay');
    await click('Credit card');
    await click('Continue');
  });
  await step('facebook', async () => {
    await see('public Facebook profile');
    await click('Yes');
  });
  await step('identity + 18+', async () => {
    await see('Who should the checks be made out to');
    await page.getByPlaceholder('Rin').fill('Rin');
    await page.getByPlaceholder('you@example.com').fill('rin@example.com');
    await click('18 or older');
    await click('Continue');
  });
  await step('loading → reveal', async () => {
    await see('Cross-checking');
    await see('live programs');
    await vis('YOU MATCH').waitFor({ timeout: 15000 });
    await shot('03-reveal');
  });
  await step('reveal numbers', async () => {
    await see('paying up to $233.66');
    await see('on your Watchlist');
    await see('you already missed');
  });
  await step('chart', async () => {
    await click('Claim it');
    await see('What fans actually got paid');
    await see('Amazon Prime FTC refunds');
    await shot('04-chart');
    await click('Continue');
  });
  await step('social proof', async () => {
    await see('paperwork nobody does');
    await see('$845,000,000');
    await click('Continue');
  });
  await step('notifications', async () => {
    await see('Deadlines don');
    await click('Not now');
  });
  await step('paywall', async () => {
    await see('Unlock every claim');
    await see('Yearly');
    await see('Weekly');
    await see('up to $234');
    await shot('05-paywall');
  });
  await step('mock purchase → Discover', async () => {
    await click('Start my 3-day free trial');
    await see('RIN, YOU MAY BE OWED');
    await see('$234');
    await shot('06-discover');
  });
  await step('discover badges', async () => {
    await see('AUTOMATIC');
    await see('WATCHING');
    await see('$0 today');
  });
  await step('detail: PSN automatic', async () => {
    await click('PlayStation Store antitrust settlement');
    await see('Who qualifies');
    await see('Track this payout');
    await shot('07-detail');
    await click('Track this payout');
    await see('Tracking');
  });
  await step('detail → back → lost bag → claim', async () => {
    await page.goBack();
    await see('YOU MAY BE OWED');
    await click('Airline lost or damaged your prop, wig or armor bag (US flight)');
    await see('Up to $4,700');
    await click('Prepare my claim');
    await see('Generate my form');
    await shot('08-claim');
  });
  await step('claim: validation then generate', async () => {
    await click('Generate my form');
    await see('required field');
    for (const [ph, val] of [
      ['Street address', '1 Fuyuki St'],
      ['City', 'Los Angeles'],
      ['State / province', 'CA'],
      ['ZIP / postal code', '90001'],
      ['Country', 'US'],
      ['Airline baggage-claims email', 'bags@example.com'],
      ['Airline / carrier', 'Delta'],
      ['Booking reference', 'ABC123'],
      ['Travel date', '2026-07-01'],
      ['Total value claimed', '1200'],
    ]) {
      const label = vis(ph);
      const input = label.locator('xpath=following::input[1] | following::textarea[1]').first();
      await input.fill(val).catch(() => {});
    }
    await click('Lost or damaged baggage');
    await vis('Last name').locator('xpath=following::input[1]').fill('Tohsaka');
    await click('Generate my form');
    await see('Your form');
    await see('Travel Compensation Claim');
    await see('Lost or damaged baggage');
    await shot('09-form');
  });
  await step('mark submitted → wallet', async () => {
    await click('mark submitted');
    await see('MONEY YOU ARE CHASING');
    await see('Submitted');
    await see('up to $1,200');
    await see('Hearing 2026-10-15');
    await see('Credit arrived');
    await shot('10-wallet');
  });
  await step('forms tab', async () => {
    await page.getByText('Forms', { exact: true }).filter({ visible: true }).last().click();
    await see('Travel Compensation Claim');
  });
  await step('profile', async () => {
    await click('Profile');
    await see('Fritter Pro');
    await see('Rin');
    await shot('11-profile');
  });

  await browser.close();
  for (const r of results) console.log(r.join(' | '));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} steps passed`);
  if (consoleErrors.length) {
    console.log('\nCONSOLE ERRORS (' + consoleErrors.length + '):');
    for (const e of [...new Set(consoleErrors)].slice(0, 15)) console.log(' - ' + e);
  }
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error('fatal', e);
  process.exit(2);
});
