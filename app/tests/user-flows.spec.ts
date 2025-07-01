import { test, expect } from '@playwright/test';

test.describe('用户核心流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问首页
    await page.goto('http://localhost:3000');
  });

  test('用户注册流程', async ({ page }) => {
    // 点击注册按钮
    await page.getByRole('link', { name: '注册' }).click();

    // 验证注册页面
    await expect(page).toHaveURL(/.*\/auth\/register/);
    await expect(page.getByRole('heading', { name: '注册易码网账户' })).toBeVisible();

    // 填写注册表单
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testUsername = `testuser${timestamp}`;

    await page.getByRole('textbox', { name: '邮箱地址' }).fill(testEmail);
    await page.getByRole('textbox', { name: '用户名' }).fill(testUsername);
    await page.getByRole('textbox', { name: '密码' }).fill('password123');
    await page.getByRole('textbox', { name: '确认密码' }).fill('password123');

    // 提交注册表单
    await page.getByRole('button', { name: '注册' }).click();

    // 验证注册成功（可能跳转到登录页面或显示成功消息）
    await expect(page).toHaveURL(/.*\/(auth\/login|dashboard)/);
  });

  test('用户登录流程', async ({ page }) => {
    // 点击登录按钮
    await page.getByRole('link', { name: '登录' }).click();

    // 验证登录页面
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.getByRole('heading', { name: '登录易码网' })).toBeVisible();

    // 填写登录表单（使用测试买家账户）
    await page.getByRole('textbox', { name: '邮箱地址' }).fill('buyer@example.com');
    await page.getByRole('textbox', { name: '密码' }).fill('buyer123');

    // 提交登录表单
    await page.getByRole('button', { name: '登录' }).click();

    // 验证登录成功（可能跳转到首页或仪表板）
    await expect(page).toHaveURL(/.*\/(|dashboard)/);
    // 验证用户已登录（检查用户菜单或退出按钮）
    await expect(page.getByText('退出登录')).toBeVisible();
  });

  test('项目浏览流程', async ({ page }) => {
    // 访问项目列表页面
    await page.getByRole('navigation').getByRole('link', { name: '项目市场' }).click();

    // 验证项目列表页面
    await expect(page).toHaveURL(/.*\/projects/);
    await expect(page.getByRole('heading', { name: '项目市场' })).toBeVisible();

    // 等待项目加载完成
    await page.waitForTimeout(2000);

    // 验证项目卡片存在（如果有项目的话）
    const projectCards = page.locator('[data-testid="project-card"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      await expect(projectCards.first()).toBeVisible();

      // 点击第一个项目查看详情
      await projectCards.first().click();

      // 验证项目详情页面
      await expect(page).toHaveURL(/.*\/projects\/[^\/]+/);
      await expect(page.getByRole('heading')).toBeVisible();
    } else {
      // 如果没有项目，验证空状态
      await expect(page.getByText('暂无项目')).toBeVisible();
    }
  });

  test('项目搜索流程', async ({ page }) => {
    // 访问项目列表页面
    await page.goto('/projects');

    // 等待页面加载
    await page.waitForTimeout(1000);

    // 使用页面内的搜索功能
    await page.getByRole('textbox', { name: '搜索项目名称、描述、技术栈' }).fill('React');
    await page.getByRole('button', { name: '搜索' }).click();

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索结果显示
    const searchResults = page.locator('[data-testid="project-card"]');
    const resultCount = await searchResults.count();

    if (resultCount > 0) {
      await expect(searchResults.first()).toBeVisible();
    } else {
      // 如果没有搜索结果，可能显示空状态或加载状态
      const noResults = page.getByText('没有找到相关项目');
      const loading = page.getByText('加载中');

      await expect(noResults.or(loading)).toBeVisible();
    }
  });

  test('分类浏览流程', async ({ page }) => {
    // 访问分类页面
    await page.getByRole('navigation').getByRole('link', { name: '分类' }).click();

    // 验证分类页面
    await expect(page).toHaveURL(/.*\/categories/);
    await expect(page.getByRole('heading', { name: '项目分类' })).toBeVisible();

    // 等待分类加载
    await page.waitForTimeout(1000);

    // 点击一个分类
    const categoryCards = page.locator('[data-testid="category-card"]');
    const categoryCount = await categoryCards.count();

    if (categoryCount > 0) {
      await categoryCards.first().click();

      // 验证分类项目列表
      await expect(page).toHaveURL(/.*\/projects.*category=/);
      await expect(page.getByText('分类：')).toBeVisible();
    } else {
      // 如果没有分类，验证空状态
      await expect(page.getByText('暂无分类')).toBeVisible();
    }
  });

  test('高级搜索流程', async ({ page }) => {
    // 访问高级搜索页面
    await page.goto('http://localhost:3000/search');
    
    // 验证高级搜索页面
    await expect(page.getByRole('heading', { name: '高级搜索' })).toBeVisible();
    
    // 填写搜索条件
    await page.getByLabel('关键词').fill('React');
    await page.getByLabel('最低价格').fill('0');
    await page.getByLabel('最高价格').fill('1000');
    
    // 选择技术栈（如果有的话）
    const techStackSelect = page.locator('select[name="techStack"]');
    if (await techStackSelect.isVisible()) {
      await techStackSelect.selectOption('React');
    }
    
    // 提交搜索
    await page.getByRole('button', { name: '搜索' }).click();
    
    // 验证搜索结果页面
    await expect(page).toHaveURL(/.*\/projects/);
  });
});

test.describe('管理员功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 管理员登录
    await page.goto('/auth/login');
    await page.getByRole('textbox', { name: '邮箱地址' }).fill('admin@example.com');
    await page.getByRole('textbox', { name: '密码' }).fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    // 验证登录成功（可能跳转到首页或仪表板）
    await expect(page).toHaveURL(/.*\/(|dashboard)/);
    await expect(page.getByText('退出登录')).toBeVisible();
  });

  test('管理员项目管理流程', async ({ page }) => {
    // 访问管理员项目管理页面
    await page.goto('http://localhost:3000/admin/projects');
    
    // 验证管理员项目管理页面
    await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
    
    // 验证项目列表
    const projectRows = page.locator('tbody tr');
    if (await projectRows.count() > 0) {
      await expect(projectRows.first()).toBeVisible();
      
      // 测试项目状态更新（如果有相关按钮）
      const statusButtons = page.locator('button[data-action="approve"], button[data-action="reject"]');
      if (await statusButtons.count() > 0) {
        await expect(statusButtons.first()).toBeVisible();
      }
    }
  });

  test('管理员分类管理流程', async ({ page }) => {
    // 访问管理员分类管理页面
    await page.goto('http://localhost:3000/admin/categories');
    
    // 验证管理员分类管理页面
    await expect(page.getByRole('heading', { name: '分类管理' })).toBeVisible();
    
    // 验证分类列表
    const categoryRows = page.locator('tbody tr');
    if (await categoryRows.count() > 0) {
      await expect(categoryRows.first()).toBeVisible();
    }
    
    // 测试添加新分类按钮
    const addButton = page.getByRole('button', { name: '添加分类' });
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});

test.describe('响应式设计测试', () => {
  test('移动端首页显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // 验证移动端导航
    const mobileMenu = page.getByRole('button', { name: '菜单' });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
    
    // 验证主要内容在移动端正常显示
    await expect(page.getByRole('heading', { name: '易码网' })).toBeVisible();
  });

  test('平板端项目列表显示', async ({ page }) => {
    // 设置平板端视口
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/projects');

    // 验证项目列表在平板端正常显示
    await expect(page.getByRole('heading', { name: '项目市场' })).toBeVisible();

    // 等待项目加载
    await page.waitForTimeout(1000);

    // 验证项目卡片布局
    const projectCards = page.locator('[data-testid="project-card"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      await expect(projectCards.first()).toBeVisible();
    } else {
      // 验证加载状态或空状态
      const loading = page.getByText('加载中');
      const empty = page.getByText('暂无项目');
      await expect(loading.or(empty)).toBeVisible();
    }
  });
});
