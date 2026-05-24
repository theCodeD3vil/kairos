import { expect, test } from '@playwright/test';

test('renders the landing page with all major sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toContainText(/Track\s+your\s+coding\s*metrics/i);
  await expect(page.getByAltText('Kairos logo')).toBeVisible();
  await expect(page.getByTestId('kairos-app-logo')).toHaveCount(2);
  await expect(page.getByText(/An open source alternative/i).first()).toBeVisible();
  await expect(page.getByText('Built on a few simple ideas.')).toBeVisible();
  await expect(page.getByText('Three pieces. Local data.')).toBeVisible();
  await expect(page.getByText('Built for everyday coding.')).toBeVisible();
  await expect(page.getByText('Local history.')).toBeVisible();
  await expect(page.getByText('Try Kairos today.')).toBeVisible();
  await expect(page.getByText(/Time trackers became spyware|Pick your poison|Stop renting your data/i)).toHaveCount(0);
});

test('exposes the three download platform buttons', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /macOS/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Windows/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Linux/i })).toBeVisible();
});

test('nav links scroll to anchors', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Features', exact: true }).click();
  await expect(page).toHaveURL(/#features$/);
});

test('mobile viewport renders core CTAs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Download v1\.1\.14/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /View on GitHub/i })).toBeVisible();
});
