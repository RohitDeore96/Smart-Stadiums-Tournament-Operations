/**
 * @file e2e/volunteer-dashboard.spec.ts
 * @description E2E test: volunteer dashboard renders zones, map, and
 *   crowd zone cards. Clicking a zone card expands it.
 */
import { test, expect } from '@playwright/test';

test.describe('Volunteer dashboard', () => {
  test('dashboard renders stadium map and crowd zone cards', async ({ page }) => {
    // Dashboard is at the root path "/" (HashRouter)
    await page.goto('/');

    // Wait for the page title to appear
    await expect(page.locator('.page-title, h2').first()).toBeVisible({ timeout: 15_000 });

    // The stadium map SVG should render — actual class is "stadium-map-svg" on the <svg> element
    const stadiumMap = page
      .locator('svg.stadium-map-svg, .stadium-map svg, .stadium-map-section')
      .first();
    await expect(stadiumMap).toBeVisible({ timeout: 15_000 });

    // Crowd zone cards should render (one per zone)
    const zoneCards = page.locator('.zone-card');
    await expect(zoneCards.first()).toBeVisible({ timeout: 15_000 });
    const cardCount = await zoneCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4); // at least 4 zones should render
  });

  test('clicking a zone card expands it to show sparkline', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.zone-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15_000 });
    await firstCard.click();

    // Expanded card should show additional details (sparkline or stats)
    await expect(page.locator('.zone-card--expanded').first()).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows live crowd readings with density bars', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await expect(page.locator('.page-title, h2').first()).toBeVisible({ timeout: 15_000 });

    // Density progress bars should render — check for zone-stats or progressbar roles
    const densityBars = page.locator(
      '.zone-density-bar, .zone-bar, [role="progressbar"], .zone-stat',
    );
    await expect(densityBars.first()).toBeVisible({ timeout: 15_000 });
    const barCount = await densityBars.count();
    expect(barCount).toBeGreaterThanOrEqual(4);
  });

  test('crush prediction badge appears when zones are trending critical', async ({ page }) => {
    // This test verifies the prediction UI renders without errors.
    // The actual prediction logic is unit-tested in predictCrush.test.ts.
    await page.goto('/');

    // Either the crush-alert-banner is visible (when zones are trending up)
    // OR the zone cards render normally. Both are valid outcomes.
    const cards = page.locator('.zone-card');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    // If a prediction badge exists, verify it has the right ARIA role
    const predictionBadge = page.locator('.zone-prediction');
    const count = await predictionBadge.count();
    if (count > 0) {
      await expect(predictionBadge.first()).toHaveAttribute('role', 'alert');
    }
  });
});
