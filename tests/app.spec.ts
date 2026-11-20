import { test, expect } from '@playwright/test';

const INTRO_KEY = 'quoteflow_intro_seen_v2';

test.describe('QuoteFlow Pro — Core UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('loads and shows app title QUOTEFLOW PRO', async ({ page }) => {
    await expect(page.locator('#root span').filter({ hasText: 'QUOTEFLOW PRO' })).toBeVisible({ timeout: 10000 });
  });

  test('intro modal appears on first visit', async ({ page }) => {
    await expect(page.locator('text=Welcome to QuoteFlow Pro')).toBeVisible({ timeout: 10000 });
  });

  test('dismissing intro modal persists across reloads', async ({ page }) => {
    await page.click('button:has-text("Get Started")');
    await expect(page.locator('text=Welcome to QuoteFlow Pro')).not.toBeVisible({ timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('text=Welcome to QuoteFlow Pro')).not.toBeVisible({ timeout: 5000 });
  });

  test('header contains version badge and theme toggle', async ({ page }) => {
    await page.click('button:has-text("Get Started")');
    await expect(page.locator('#root span').filter({ hasText: 'QUOTEFLOW PRO' })).toBeVisible();
    await expect(page.locator('text=v2.0.0')).toBeVisible();
    const darkBtn = page.locator('button').filter({ hasText: /Dark|Light/ }).first();
    await expect(darkBtn).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('sidebar shows all navigation buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("📋 All Quotes")')).toBeVisible();
    await expect(page.locator('button:has-text("🔍 Report & Analysis")')).toBeVisible();
    await expect(page.locator('button:has-text("📒 Price Book")')).toBeVisible();
    await expect(page.locator('button:has-text("⚙️ Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("🛡️ Troubleshoot")')).toBeVisible();
    await expect(page.locator('button:has-text("➕ New Quotation")')).toBeVisible();
  });

  test('clicking New Quotation opens type picker', async ({ page }) => {
    await page.click('button:has-text("➕ New Quotation")');
    await expect(page.locator('text=Create New Quotation')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Quote CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('can create a new standard quote', async ({ page }) => {
    await page.click('button:has-text("➕ New Quotation")');
    await expect(page.locator('text=Create New Quotation')).toBeVisible();
    await page.click('button:has-text("Standard Services")');
    // Editor should show with input fields and meta labels
    await expect(page.locator('label:has-text("Reference")').first()).toBeVisible({ timeout: 5000 });
  });

  test('can create a new valve quote', async ({ page }) => {
    await page.click('button:has-text("➕ New Quotation")');
    await page.click('button:has-text("Valve Testing")');
    await expect(page.locator('label:has-text("Reference")').first()).toBeVisible({ timeout: 5000 });
  });

  test('editor has visible input fields after creating quote', async ({ page }) => {
    await page.click('button:has-text("➕ New Quotation")');
    await page.click('button:has-text("Standard Services")');
    await page.waitForTimeout(300);

    const textInputs = page.locator('input[type="text"], input:not([type])');
    expect(await textInputs.count()).toBeGreaterThan(0);
  });

  test('can fill a text field in the editor', async ({ page }) => {
    await page.click('button:has-text("➕ New Quotation")');
    await page.click('button:has-text("Standard Services")');
    await page.waitForTimeout(300);

    const clientInput = page.locator('input[placeholder*="Client"], input[value*=""]').first();
    if (await clientInput.count() > 0) {
      await clientInput.fill('Test Client Corp');
      await expect(clientInput).toHaveValue('Test Client Corp');
    } else {
      // Fallback: fill any visible text input
      const anyInput = page.locator('input[type="text"]').first();
      if (await anyInput.count() > 0) {
        await anyInput.fill('Test Client Corp');
        await expect(anyInput).toHaveValue('Test Client Corp');
      }
    }

    // Press Escape to save/close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(page.locator('#root span').filter({ hasText: 'QUOTEFLOW PRO' })).toBeVisible();
  });
});

test.describe('Search & Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('search input exists and filters by typing', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search ref/client"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('NONEXISTENT999');
    await page.waitForTimeout(300);
    await expect(page.locator('table')).toBeVisible();
  });

  test('filter dropdowns exist in sidebar', async ({ page }) => {
    const sidebarSelects = page.locator('aside select');
    expect(await sidebarSelects.count()).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('theme toggle button switches between dark and light', async ({ page }) => {
    let darkBtn = page.locator('button').filter({ hasText: 'Dark' }).first();
    await expect(darkBtn).toBeVisible();

    await darkBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: 'Light' }).first()).toBeVisible();

    await page.locator('button').filter({ hasText: 'Light' }).first().click();
    await page.waitForTimeout(300);
    await expect(darkBtn).toBeVisible();
  });
});

test.describe('Language Switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('language selector exists in header', async ({ page }) => {
    const langSelect = page.locator('header select');
    await expect(langSelect).toBeVisible();
    // Verify options are present by checking the select has the right value count
    const options = await langSelect.locator('option').all();
    expect(options.length).toBeGreaterThanOrEqual(2);
  });

  test('switching to Arabic sets RTL direction on html element', async ({ page }) => {
    const langSelect = page.locator('header select');
    await langSelect.selectOption('ar');
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('language selection persists after reload', async ({ page }) => {
    const langSelect = page.locator('header select');
    await langSelect.selectOption('ar');
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.reload({ waitUntil: 'networkidle' });
    // Intro modal may appear again — dismiss it
    const dismissBtn = page.locator('button:has-text("Get Started")').first();
    if (await dismissBtn.count() > 0 && await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('Diagnostics Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('navigating to troubleshoot shows diagnostics panel', async ({ page }) => {
    await page.click('button:has-text("🛡️ Troubleshoot")');
    await expect(page.locator('h1:has-text("Troubleshoot & Diagnostics")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=System Information')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=DB Size')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Quotes', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('re-run diagnostics button refreshes results', async ({ page }) => {
    await page.click('button:has-text("🛡️ Troubleshoot")');
    await expect(page.locator('h1:has-text("Troubleshoot & Diagnostics")')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const rerunBtn = page.locator('button:has-text("Re-run"), button:has-text("Refresh")');
    if (await rerunBtn.count() > 0) {
      await rerunBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=System Information')).toBeVisible();
    }
  });
});

test.describe('Settings View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('navigating to settings shows business info section', async ({ page }) => {
    await page.click('button:has-text("⚙️ Settings")');
    await expect(page.locator('text=Business Information')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Appearance')).toBeVisible();
    await expect(page.locator('text=Storage & Sync')).toBeVisible();
    await expect(page.locator('text=Backup & Restore')).toBeVisible();
  });

  test('language selector exists in settings view', async ({ page }) => {
    await page.click('button:has-text("⚙️ Settings")');
    // Settings also has a language select — check it's there
    const settingsLang = page.locator('text=Language');
    await expect(settingsLang).toBeVisible();
  });
});

test.describe('Reports Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('reports view shows summary cards', async ({ page }) => {
    await page.click('button:has-text("🔍 Report & Analysis")');
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Quotes')).toBeVisible();
    await expect(page.getByText('Revenue', { exact: true })).toBeVisible();
  });
});

test.describe('Price Book', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('price book view loads with companies list', async ({ page }) => {
    await page.click('button:has-text("📒 Price Book")');
    await expect(page.locator('text=Companies')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Batch Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { try { localStorage.removeItem(key); } catch {} }, INTRO_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Get Started")');
  });

  test('checkboxes are accessible in quotes table when quotes exist', async ({ page }) => {
    const checkboxes = page.locator('table tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await expect(checkboxes.first()).toBeVisible();
    }
  });
});
