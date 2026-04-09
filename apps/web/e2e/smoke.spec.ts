import { expect, test } from '@playwright/test';

test('loads landing page, anchors, and core CTAs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Kairos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Features', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/#features/);

  const downloadHref = await page.getByTestId('cta-download').getAttribute('href');
  const extensionHref = await page.getByTestId('cta-extension').getAttribute('href');

  expect(downloadHref).toContain('/releases/latest');
  expect(extensionHref).toContain('#vs-code-extension');

  const themeButton = page.getByTestId('theme-toggle');
  await expect(themeButton).toContainText('Theme:');
  await themeButton.click();
  await expect(themeButton).toContainText('Theme: Light');
});

test('renders mobile and desktop layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Download Kairos' }).first()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
});
