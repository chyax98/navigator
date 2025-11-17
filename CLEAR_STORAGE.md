# 清空 Chrome Storage 测试指南

## 问题：置顶书签刷新后丢失

## 测试步骤

### 1. 清空现有数据
在 Chrome 扩展页面打开开发者工具，在控制台运行：

```javascript
chrome.storage.local.clear(() => {
  console.log('存储已清空');
});
```

### 2. 刷新扩展页面

### 3. 添加书签并置顶
- 添加一个书签
- 点击置顶按钮（📌图标）
- 确认书签显示在主页

### 4. 刷新页面
- 按 F5 或 Cmd+R 刷新
- **检查书签是否仍然显示在主页**

### 5. 检查存储数据
在控制台运行：

```javascript
chrome.storage.local.get(null, (result) => {
  console.log('所有存储键:', Object.keys(result));

  const ids = result.navigator_bookmark_ids || [];
  console.log(`书签数量: ${ids.length}`);

  ids.forEach(id => {
    const bookmark = result[`navigator_bookmark_${id}`];
    if (bookmark) {
      console.log(bookmark.title, {
        isPinned: bookmark.isPinned,
        pinnedAt: bookmark.pinnedAt
      });
    }
  });
});
```

## 预期结果
- isPinned 应该为 `true`
- pinnedAt 应该是 ISO 格式的时间字符串

## 如果仍然失败
说明问题在 `prepareBookmarkForStorage` 或 `toggleBookmarkPin` 逻辑中
