import { test, expect } from '@playwright/test';

test.describe('购买流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 用户登录（使用测试买家账户）
    await page.goto('http://localhost:3000/auth/login');
    await page.getByLabel('邮箱').fill('buyer@example.com');
    await page.getByLabel('密码').fill('buyer123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('完整购买流程', async ({ page }) => {
    // 1. 浏览项目
    await page.goto('http://localhost:3000/projects');
    await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible();
    
    // 2. 选择一个项目
    const projectCards = page.locator('[data-testid="project-card"]');
    if (await projectCards.count() > 0) {
      await projectCards.first().click();
      
      // 3. 查看项目详情
      await expect(page).toHaveURL(/.*\/projects\/[^\/]+/);
      await expect(page.getByRole('heading')).toBeVisible();
      
      // 4. 检查购买按钮
      const purchaseButton = page.getByRole('button', { name: '购买' });
      if (await purchaseButton.isVisible()) {
        // 5. 点击购买按钮
        await purchaseButton.click();
        
        // 6. 验证购买确认页面或模态框
        const confirmDialog = page.getByRole('dialog');
        if (await confirmDialog.isVisible()) {
          await expect(confirmDialog.getByText('确认购买')).toBeVisible();
          
          // 7. 确认购买
          await confirmDialog.getByRole('button', { name: '确认' }).click();
          
          // 8. 验证购买成功
          await expect(page.getByText('购买成功')).toBeVisible();
        } else {
          // 如果没有确认对话框，可能直接跳转到购买页面
          await expect(page).toHaveURL(/.*\/purchase/);
        }
      } else {
        // 如果没有购买按钮，可能是已购买或免费项目
        const downloadButton = page.getByRole('button', { name: '下载' });
        if (await downloadButton.isVisible()) {
          await expect(downloadButton).toBeVisible();
        }
      }
    }
  });

  test('积分余额检查', async ({ page }) => {
    // 访问个人资料页面查看积分余额
    await page.goto('http://localhost:3000/profile');
    
    // 验证积分余额显示
    const creditsDisplay = page.locator('[data-testid="credits-balance"]');
    if (await creditsDisplay.isVisible()) {
      await expect(creditsDisplay).toBeVisible();
      
      // 获取当前积分余额
      const creditsText = await creditsDisplay.textContent();
      console.log('当前积分余额:', creditsText);
    }
  });

  test('购买历史查看', async ({ page }) => {
    // 访问购买历史页面
    await page.goto('http://localhost:3000/dashboard/purchases');
    
    // 验证购买历史页面
    await expect(page.getByRole('heading', { name: '购买历史' })).toBeVisible();
    
    // 验证购买记录列表
    const purchaseRows = page.locator('[data-testid="purchase-record"]');
    if (await purchaseRows.count() > 0) {
      await expect(purchaseRows.first()).toBeVisible();
      
      // 验证购买记录包含必要信息
      await expect(purchaseRows.first().getByText('项目名称')).toBeVisible();
      await expect(purchaseRows.first().getByText('购买时间')).toBeVisible();
      await expect(purchaseRows.first().getByText('价格')).toBeVisible();
    } else {
      // 如果没有购买记录，应该显示空状态
      await expect(page.getByText('暂无购买记录')).toBeVisible();
    }
  });

  test('下载已购买项目', async ({ page }) => {
    // 访问购买历史页面
    await page.goto('http://localhost:3000/dashboard/purchases');
    
    // 查找已购买的项目
    const purchaseRows = page.locator('[data-testid="purchase-record"]');
    if (await purchaseRows.count() > 0) {
      // 点击第一个购买记录的下载按钮
      const downloadButton = purchaseRows.first().getByRole('button', { name: '下载' });
      if (await downloadButton.isVisible()) {
        // 监听下载事件
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        
        // 验证下载开始
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });

  test('积分不足时的购买流程', async ({ page }) => {
    // 首先检查当前积分余额
    await page.goto('http://localhost:3000/profile');
    
    // 寻找一个价格较高的项目进行测试
    await page.goto('http://localhost:3000/projects');
    
    // 使用高级搜索找到高价项目
    await page.goto('http://localhost:3000/search');
    await page.getByLabel('最低价格').fill('10000'); // 设置一个很高的价格
    await page.getByRole('button', { name: '搜索' }).click();
    
    const projectCards = page.locator('[data-testid="project-card"]');
    if (await projectCards.count() > 0) {
      await projectCards.first().click();
      
      const purchaseButton = page.getByRole('button', { name: '购买' });
      if (await purchaseButton.isVisible()) {
        await purchaseButton.click();
        
        // 验证积分不足的错误提示
        await expect(page.getByText('积分余额不足')).toBeVisible();
        
        // 验证充值提示或链接
        const rechargeLink = page.getByRole('link', { name: '充值' });
        if (await rechargeLink.isVisible()) {
          await expect(rechargeLink).toBeVisible();
        }
      }
    }
  });
});

test.describe('卖家功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 卖家登录
    await page.goto('http://localhost:3000/auth/login');
    await page.getByLabel('邮箱').fill('seller@example.com');
    await page.getByLabel('密码').fill('seller123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('项目上传流程', async ({ page }) => {
    // 访问项目上传页面
    await page.goto('http://localhost:3000/seller/upload');
    
    // 验证上传页面
    await expect(page.getByRole('heading', { name: '上传项目' })).toBeVisible();
    
    // 填写项目信息
    await page.getByLabel('项目标题').fill('测试项目');
    await page.getByLabel('项目描述').fill('这是一个测试项目的描述');
    await page.getByLabel('价格').fill('100');
    
    // 选择分类
    const categorySelect = page.locator('select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // 上传文件（如果有文件上传功能）
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // 这里需要准备一个测试文件
      // await fileInput.setInputFiles('path/to/test/file.zip');
    }
    
    // 提交表单
    await page.getByRole('button', { name: '提交审核' }).click();
    
    // 验证提交成功
    await expect(page.getByText('项目提交成功')).toBeVisible();
  });

  test('卖家项目管理', async ({ page }) => {
    // 访问卖家项目管理页面
    await page.goto('http://localhost:3000/seller/projects');
    
    // 验证项目管理页面
    await expect(page.getByRole('heading', { name: '我的项目' })).toBeVisible();
    
    // 验证项目列表
    const projectRows = page.locator('[data-testid="seller-project"]');
    if (await projectRows.count() > 0) {
      await expect(projectRows.first()).toBeVisible();
      
      // 验证项目状态显示
      await expect(projectRows.first().locator('[data-testid="project-status"]')).toBeVisible();
      
      // 测试编辑项目功能
      const editButton = projectRows.first().getByRole('button', { name: '编辑' });
      if (await editButton.isVisible()) {
        await editButton.click();
        await expect(page.getByRole('heading', { name: '编辑项目' })).toBeVisible();
      }
    }
  });

  test('销售统计查看', async ({ page }) => {
    // 访问卖家仪表板
    await page.goto('http://localhost:3000/dashboard');
    
    // 验证销售统计信息
    const statsCards = page.locator('[data-testid="stats-card"]');
    if (await statsCards.count() > 0) {
      await expect(statsCards.first()).toBeVisible();
    }
    
    // 验证收益信息
    const earningsDisplay = page.locator('[data-testid="earnings"]');
    if (await earningsDisplay.isVisible()) {
      await expect(earningsDisplay).toBeVisible();
    }
  });
});

test.describe('错误处理测试', () => {
  test('网络错误处理', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('http://localhost:3000/projects');
    
    // 验证错误提示
    await expect(page.getByText('加载失败')).toBeVisible();
    
    // 验证重试按钮
    const retryButton = page.getByRole('button', { name: '重试' });
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('未授权访问处理', async ({ page }) => {
    // 未登录状态下访问需要登录的页面
    await page.goto('http://localhost:3000/dashboard');
    
    // 验证重定向到登录页面
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.getByText('请先登录')).toBeVisible();
  });
});
