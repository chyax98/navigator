/**
 * Chrome Storage 诊断脚本
 *
 * 使用方法：
 * 1. 打开 Chrome 扩展
 * 2. F12 打开开发者工具
 * 3. 复制粘贴这整个脚本到 Console 并回车
 * 4. 查看输出
 */

(async function debugChromeStorage() {
  console.log('=== Chrome Storage 诊断开始 ===\n');

  try {
    // 1. 检查 Chrome Storage API 是否可用
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('❌ Chrome Storage API 不可用');
      return;
    }
    console.log('✅ Chrome Storage API 可用\n');

    // 2. 读取所有数据
    const allData = await new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });

    console.log('📦 Chrome Storage 中的所有 key:');
    console.log(Object.keys(allData));
    console.log('');

    // 3. 检查书签数据
    const STORAGE_KEYS = {
      BOOKMARKS: 'navigator_bookmarks',
      CATEGORIES: 'navigator_categories',
      CONFIG: 'navigator_config',
      HOMEPAGE_ITEMS: 'navigator_homepage_items',
      HOMEPAGE_LAYOUT: 'navigator_homepage_layout'
    };

    console.log('📚 书签数据 (navigator_bookmarks):');
    const bookmarks = allData[STORAGE_KEYS.BOOKMARKS];
    if (!bookmarks) {
      console.warn('⚠️  没有书签数据');
    } else if (!Array.isArray(bookmarks)) {
      console.error('❌ 书签数据格式错误（不是数组）:', typeof bookmarks);
    } else {
      console.log(`  总数: ${bookmarks.length}`);
      console.log(`  置顶书签数: ${bookmarks.filter(b => b.isPinned).length}`);

      // 显示前 3 个书签
      bookmarks.slice(0, 3).forEach((b, i) => {
        console.log(`  [${i}] ${b.title} - isPinned: ${b.isPinned}, source: ${b.source || 'user'}`);
      });

      // 显示所有置顶书签
      const pinnedBookmarks = bookmarks.filter(b => b.isPinned);
      if (pinnedBookmarks.length > 0) {
        console.log(`\n  📌 置顶书签详情:`);
        pinnedBookmarks.forEach((b, i) => {
          console.log(`    [${i}] ${b.title}`);
          console.log(`        isPinned: ${b.isPinned}`);
          console.log(`        pinnedAt: ${b.pinnedAt}`);
          console.log(`        source: ${b.source || 'user'}`);
        });
      }
    }
    console.log('');

    // 4. 检查分类数据
    console.log('📂 分类数据 (navigator_categories):');
    const categories = allData[STORAGE_KEYS.CATEGORIES];
    if (!categories) {
      console.warn('⚠️  没有分类数据');
    } else if (!Array.isArray(categories)) {
      console.error('❌ 分类数据格式错误（不是数组）:', typeof categories);
    } else {
      console.log(`  总数: ${categories.length}`);
      categories.slice(0, 5).forEach((c, i) => {
        console.log(`  [${i}] ${c.name} (${c.id})`);
      });
    }
    console.log('');

    // 5. 检查主页布局
    console.log('🏠 主页布局 (navigator_homepage_layout):');
    const layout = allData[STORAGE_KEYS.HOMEPAGE_LAYOUT];
    if (!layout) {
      console.warn('⚠️  没有主页布局数据');
    } else {
      console.log(`  列数: ${layout.config?.columns || '未设置'}`);
      console.log(`  项目数: ${layout.items?.length || 0}`);
    }
    console.log('');

    // 6. 计算总大小
    const totalSize = new Blob([JSON.stringify(allData)]).size;
    console.log(`💾 总存储大小: ${(totalSize / 1024).toFixed(2)} KB (上限: 5120 KB)\n`);

    // 7. 测试写入
    console.log('🧪 测试写入...');
    const testKey = 'navigator_test_' + Date.now();
    const testValue = { test: true, timestamp: new Date().toISOString() };

    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [testKey]: testValue }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    console.log('✅ 写入测试成功');

    // 验证写入
    const readBack = await new Promise((resolve) => {
      chrome.storage.local.get([testKey], resolve);
    });

    if (readBack[testKey] && readBack[testKey].test === true) {
      console.log('✅ 读取验证成功');
    } else {
      console.error('❌ 读取验证失败');
    }

    // 清除测试数据
    await new Promise((resolve) => {
      chrome.storage.local.remove([testKey], resolve);
    });
    console.log('✅ 测试数据已清除\n');

    console.log('=== 诊断完成 ===\n');
    console.log('💡 建议操作：');
    console.log('1. 如果书签数据为空或数量不对，说明数据没有写入');
    console.log('2. 如果置顶书签数为 0，但你确实置顶了书签，说明 isPinned 字段没有保存');
    console.log('3. 如果书签存在但刷新后消失，请运行此脚本刷新前后对比');

  } catch (error) {
    console.error('❌ 诊断过程出错:', error);
  }
})();
