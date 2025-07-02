import { test, expect } from '@playwright/test';

test.describe('卖家信息显示测试', () => {
  test.beforeEach(async ({ page }) => {
    // 确保每个测试开始时都是未登录状态
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('未登录用户应该能看到项目的卖家信息', async ({ page }) => {
    // 访问项目市场页面
    await page.goto('/projects');
    
    // 等待项目列表加载完成
    await expect(page.locator('text=共找到')).toBeVisible({ timeout: 15000 });
    
    // 检查是否有项目卡片
    const projectCards = page.locator('[data-testid="project-card"]').or(
      page.locator('a[href*="/projects/"]').first()
    );
    await expect(projectCards.first()).toBeVisible();
    
    // 检查卖家信息是否显示
    const sellerInfo = page.locator('text=匿名用户').first();
    const hasAnonymousUser = await sellerInfo.isVisible();
    
    if (hasAnonymousUser) {
      console.log('❌ 发现匿名用户显示，这表明卖家信息获取失败');
      
      // 检查控制台错误
      const logs: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logs.push(msg.text());
        }
      });
      
      // 刷新页面重新检查
      await page.reload();
      await expect(page.locator('text=共找到')).toBeVisible({ timeout: 15000 });
      
      // 输出控制台错误信息
      if (logs.length > 0) {
        console.log('控制台错误:', logs);
      }
      
      // 测试失败
      expect(hasAnonymousUser).toBe(false);
    } else {
      console.log('✅ 未登录用户可以正常看到卖家信息');
    }
  });

  test('普通买家用户应该能看到项目的卖家信息', async ({ page }) => {
    // 创建一个普通买家账户并登录
    await page.goto('/auth/register');
    
    const timestamp = Date.now();
    const testEmail = `buyer${timestamp}@test.com`;
    const testUsername = `buyer${timestamp}`;
    
    // 填写注册表单
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder*="用户名"]', testUsername);
    await page.fill('input[type="password"]:not([placeholder*="确认"])', 'password123');
    await page.fill('input[placeholder*="确认密码"]', 'password123');
    
    // 提交注册
    await page.click('button[type="submit"]');
    
    // 等待注册成功并跳转
    await expect(page).toHaveURL(/\/dashboard|\/projects/, { timeout: 10000 });
    
    // 访问项目市场页面
    await page.goto('/projects');
    
    // 等待项目列表加载完成
    await expect(page.locator('text=共找到')).toBeVisible({ timeout: 15000 });
    
    // 检查卖家信息显示
    const sellerInfo = page.locator('text=匿名用户').first();
    const hasAnonymousUser = await sellerInfo.isVisible();
    
    if (hasAnonymousUser) {
      console.log('❌ 普通买家用户看到匿名用户，卖家信息获取失败');
      expect(hasAnonymousUser).toBe(false);
    } else {
      console.log('✅ 普通买家用户可以正常看到卖家信息');
    }
  });

  test('卖家用户应该能看到项目的卖家信息', async ({ page }) => {
    // 使用现有的测试账户登录
    await page.goto('/auth/login');
    
    // 使用测试账户1（假设是卖家）
    await page.click('button:has-text("测试账户1")');
    await page.click('button:has-text("登录")');
    
    // 等待登录成功
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // 访问项目市场页面
    await page.goto('/projects');
    
    // 等待项目列表加载完成
    await expect(page.locator('text=共找到')).toBeVisible({ timeout: 15000 });
    
    // 检查卖家信息显示
    const sellerInfo = page.locator('text=匿名用户').first();
    const hasAnonymousUser = await sellerInfo.isVisible();
    
    if (hasAnonymousUser) {
      console.log('❌ 卖家用户看到匿名用户，卖家信息获取失败');
      expect(hasAnonymousUser).toBe(false);
    } else {
      console.log('✅ 卖家用户可以正常看到卖家信息');
    }
  });

  test('管理员用户应该能看到项目的卖家信息', async ({ page }) => {
    // 使用管理员账户登录
    await page.goto('/auth/login');
    
    // 使用测试账户2（管理员）
    await page.click('button:has-text("测试账户2")');
    await page.click('button:has-text("登录")');
    
    // 等待登录成功
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // 访问项目市场页面
    await page.goto('/projects');
    
    // 等待项目列表加载完成
    await expect(page.locator('text=共找到')).toBeVisible({ timeout: 15000 });
    
    // 检查卖家信息显示
    const sellerInfo = page.locator('text=匿名用户').first();
    const hasAnonymousUser = await sellerInfo.isVisible();
    
    if (hasAnonymousUser) {
      console.log('❌ 管理员用户看到匿名用户，卖家信息获取失败');
      expect(hasAnonymousUser).toBe(false);
    } else {
      console.log('✅ 管理员用户可以正常看到卖家信息');
    }
  });

  test('验证数据库查询权限问题', async ({ page }) => {
    // 监听网络请求
    const apiCalls: string[] = [];
    page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('/api/')) {
        apiCalls.push(`${response.status()} ${response.url()}`);
      }
    });

    // 监听控制台错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 访问项目市场页面（未登录状态）
    await page.goto('/projects');
    
    // 等待页面加载
    await page.waitForTimeout(10000);
    
    // 输出调试信息
    console.log('API调用记录:', apiCalls);
    console.log('控制台错误:', consoleErrors);
    
    // 检查是否有权限相关的错误
    const hasPermissionError = consoleErrors.some(error => 
      error.includes('permission') || 
      error.includes('RLS') || 
      error.includes('policy') ||
      error.includes('access denied')
    );
    
    if (hasPermissionError) {
      console.log('❌ 发现权限相关错误，需要修复RLS策略');
    } else {
      console.log('✅ 未发现明显的权限错误');
    }
  });
});
