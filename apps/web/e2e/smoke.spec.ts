import { expect, test } from '@playwright/test';

test('loads landing page, anchors, and core CTAs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Kairos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Features', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install', exact: true })).toBeVisible();

  const homeDock = page.locator('nav.fixed.bottom-4 a[href="#top"]');
  await expect(homeDock).toHaveClass(/dock-link-active/);

  await page.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/#features/);
  await expect(page.locator('nav.fixed.bottom-4 a[href="#features"]')).toHaveClass(/dock-link-active/);

  const downloadHref = await page.getByTestId('cta-download').getAttribute('href');
  const extensionHref = await page.getByTestId('cta-extension').getAttribute('href');

  expect(downloadHref).toContain('/releases/latest');
  expect(extensionHref).toContain('#vs-code-extension');

  const themeButton = page.getByTestId('theme-toggle');
  await expect(themeButton).not.toContainText('Theme:');
  await themeButton.click();
  await themeButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('renders mobile and desktop layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Download Kairos' }).first()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
});
