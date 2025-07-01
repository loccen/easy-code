import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the main heading and description', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 检查主标题
    await expect(page.getByRole('heading', { name: '易码网' })).toBeVisible();

    // 检查描述文本（使用更精确的选择器）
    await expect(page.locator('main').getByText('专业的源码交易平台，为开发者提供安全、高效的源码交易体验')).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // 检查三个特性卡片
    await expect(page.getByRole('heading', { name: '安全可靠' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '一键部署' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '积分经济' })).toBeVisible();
  });

  test('should display navigation and footer', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 检查导航链接（使用更精确的选择器）
    await expect(page.getByRole('navigation').getByRole('link', { name: '项目市场' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: '分类' })).toBeVisible();

    // 检查页脚内容
    await expect(page.getByText('© 2025 易码网. 保留所有权利.')).toBeVisible();
  });

  test('should have working buttons', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 检查按钮是否存在
    await expect(page.getByRole('button', { name: '开始探索' })).toBeVisible();
    await expect(page.getByRole('button', { name: '高级搜索' })).toBeVisible();
  });
});
