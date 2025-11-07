import { test, expect } from '@playwright/test';

test.describe('导航应用 UI 综合测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // 更稳健的交互覆盖：搜索建议、设置导航、滚动与新增书签
  test('搜索建议与打开设置', async ({ page }) => {
    const searchInput = page.locator('.header-search .search-box input');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await page.waitForTimeout(200);

    // 建议面板出现并点击“打开设置”
    const suggestions = page.locator('.search-suggestions');
    await expect(suggestions).toBeVisible();
    await suggestions.getByText('打开设置', { exact: true }).click();

    // 路由跳转到设置并显示设置弹窗
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('.settings-modal')).toBeVisible();
    await expect(page.getByText('应用设置')).toBeVisible();
  });

  test('搜索建议滚动到最近访问', async ({ page }) => {
    const searchInput = page.locator('.header-search .search-box input');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await page.waitForTimeout(200);

    const suggestions = page.locator('.search-suggestions');
    await expect(suggestions).toBeVisible();
    await suggestions.getByText('查看最近访问', { exact: true }).click();

    // 等待滚动发生并验证 recent 区块进入视口
    await page.waitForFunction(() => window.scrollY > 0);
    const isRecentNearTop = await page.evaluate(() => {
      const el = document.getElementById('recent');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight * 0.5;
    });
    expect(isRecentNearTop).toBeTruthy();
  });

  test('新增书签流程：打开、填写、保存并验证显示', async ({ page }) => {
    const searchInput = page.locator('.header-search .search-box input');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await page.waitForTimeout(200);

    const suggestions = page.locator('.search-suggestions');
    await expect(suggestions).toBeVisible();
    await suggestions.getByText('新增书签', { exact: true }).click();

    // 书签表单模态出现
    const bookmarkModal = page.locator('.n-modal');
    await expect(bookmarkModal).toBeVisible();
    await expect(page.getByText('添加书签')).toBeVisible();

    // 使用占位符定位输入框并填写
    const titleInput = page.locator('input[placeholder*="标题"]');
    const urlInput = page.locator('input[placeholder*="http"]');

    // 如果占位符不含“http”，兜底为“网址”关键字
    const finalUrlInput = (await urlInput.count()) > 0
      ? urlInput
      : page.locator('input[placeholder*="网址"]');

    await expect(titleInput).toBeVisible();
    await expect(finalUrlInput).toBeVisible();

    await titleInput.fill('测试书签');
    await finalUrlInput.fill('https://example.com/');

    // 保存
    await page.getByRole('button', { name: '保存' }).click();

    // 成功提示与模态关闭
    await expect(page.getByText(/书签已添加到/)).toBeVisible();
    await expect(bookmarkModal).toBeHidden();

    // 在内容区出现该书签（可能在“最新收藏”或主列表中）
    const possibleList = page.locator('.bookmark-grid, .bookmarks, .app-content');
    await expect(possibleList.getByText('测试书签')).toBeVisible();
  });

  test('应用基本加载测试', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/Navigator/);

    // 检查主要组件���否加载
    await expect(page.locator('body')).toBeVisible();

    // 等待应用完全加载
    await page.waitForLoadState('networkidle');

    // 检查控制台错误
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // 等待一下，收集错误日志
    await page.waitForTimeout(2000);

    if (logs.length > 0) {
      console.log('发现控制台错误:', logs);
    }
  });

  test('响应式布局测试', async ({ page }) => {
    // 桌面布局
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // 检查侧边栏
    const sidebar = page.locator('.sidebar, aside, [data-testid="sidebar"]');
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible();
    }

    // 移动端布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // 检查移动端适配
    const mobileMenu = page.locator('.mobile-menu, [data-testid="mobile-menu"], .hamburger');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('搜索功能测试', async ({ page }) => {
    // 查找搜索框
    const searchBox = page.locator('input[placeholder*="搜索"], input[placeholder*="search"], .search-box input, [data-testid="search-input"]');

    if (await searchBox.count() > 0) {
      await expect(searchBox.first()).toBeVisible();

      // 测试搜索输入
      await searchBox.first().fill('测试搜索');
      await page.waitForTimeout(500);

      // 检查搜索结果
      const searchResults = page.locator('.search-results, .search-list, [data-testid="search-results"]');
      if (await searchResults.count() > 0) {
        await expect(searchResults.first()).toBeVisible();
      }
    } else {
      console.log('未找到搜索框组件');
    }
  });

  test('导航和路由测试', async ({ page }) => {
    // 检查导航链接
    const navLinks = page.locator('nav a, .nav-link, [data-testid="nav-link"]');

    const linkCount = await navLinks.count();
    if (linkCount > 0) {
      // 点击前几个导航链接
      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href && !href.startsWith('http')) {
          await link.click();
          await page.waitForTimeout(1000);

          // 检查页面是否正确跳转
          await expect(page).toHaveURL(new RegExp(href));
        }
      }
    }
  });

  test('表单交互测试', async ({ page }) => {
    // 查找表单
    const forms = page.locator('form');

    if (await forms.count() > 0) {
      const form = forms.first();

      // 查找表单输入
      const inputs = form.locator('input, textarea, select');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // 测试第一个输入框
        const firstInput = inputs.first();
        await firstInput.fill('测试数据');
        await page.waitForTimeout(500);

        // 检查是否有验证错误
        const errors = page.locator('.error, .invalid, [data-testid="error"]');
        if (await errors.count() > 0) {
          console.log('发现表单验证错误:', await errors.allTextContents());
        }
      }

      // 查找提交按钮
      const submitBtn = form.locator('button[type="submit"], .btn-submit, [data-testid="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('模态框和弹窗测试', async ({ page }) => {
    // 查找触发模态框的按钮
    const modalTriggers = page.locator('[data-testid="modal-trigger"], .modal-trigger, .btn-modal');

    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      await page.waitForTimeout(500);

      // 检查模态框是否出现
      const modal = page.locator('.modal, .dialog, [data-testid="modal"]');
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();

        // 测试关闭模态框
        const closeBtn = modal.first().locator('.close, .modal-close, [data-testid="modal-close"]');
        if (await closeBtn.count() > 0) {
          await closeBtn.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('性能和加载测试', async ({ page }) => {
    // 监听性能指标
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve({
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
          });
        }, 2000);
      });
    });

    console.log('性能指标:', performanceMetrics);

    // 检查图片加载
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        await expect(img).toHaveAttribute('src');

        // 检查图片是否加载完成
        const naturalWidth = await img.evaluate(img => img.naturalWidth);
        if (naturalWidth === 0) {
          console.log(`图片 ${i} 加载失败:`, await img.getAttribute('src'));
        }
      }
    }
  });

  test('可访问性测试', async ({ page }) => {
    // 检查 alt 属性
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      console.log(`发现 ${imagesWithoutAlt} 个缺少 alt 属性的图片`);
    }

    // 检查 ARIA 标签
    const buttonsWithoutLabel = await page.locator('button:not([aria-label]):not([title])').count();
    if (buttonsWithoutLabel > 0) {
      console.log(`发现 ${buttonsWithoutLabel} 个缺少无障碍标签的按钮`);
    }

    // 检查标题层次结构
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    if (headings.length === 0) {
      console.log('页面缺少标题结构');
    }
  });

  test('错误处理测试', async ({ page }) => {
    // 监听网络请求错误
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    // 等待一段时间收集错误
    await page.waitForTimeout(3000);

    if (failedRequests.length > 0) {
      console.log('发现网络请求失败:', failedRequests);
    }

    // 检查 JavaScript 错误
    const jsErrors: string[] = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.waitForTimeout(2000);

    if (jsErrors.length > 0) {
      console.log('发现 JavaScript 错误:', jsErrors);
    }
  });

  test('交互元素可用性测试', async ({ page }) => {
    // 查找所有可交互元素
    const interactiveElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');

    const elementCount = await interactiveElements.count();
    console.log(`找到 ${elementCount} 个可交互元素`);

    if (elementCount > 0) {
      // 测试前几个元素的焦点和点击
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        const element = interactiveElements.nth(i);

        // 检查元素是否可见
        if (await element.isVisible()) {
          // 测试 Tab 键导航
          await page.keyboard.press('Tab');
          await page.waitForTimeout(200);

          // 检查元素是否可以聚焦
          const focused = await element.evaluate(el => el === document.activeElement);
          if (focused) {
            console.log(`元素 ${i} 可以正确聚焦`);
          }
        }
      }
    }
  });
});
