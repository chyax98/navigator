# 主页书签持久化修复 - 测试说明

## 问题描述
用户报告添加到主页的书签（点击房子图标）偶尔会丢失，刷新后消失。

## 修复内容
1. **互斥锁保护**：为 `saveHomepageLayout` 添加了互斥锁，防止并发写入导致的数据覆盖
2. **详细日志**：添加了完整的调试日志，用于诊断问题

## 如何测试

### 1. 加载新版本扩展
1. 打开 Chrome：`chrome://extensions/`
2. 找到 "Navigator" 扩展
3. 点击右下角的 **🔄 刷新按钮**（重要！）
4. 关闭所有 Navigator 标签页
5. 打开新标签页

### 2. 打开调试面板
- 点击右上角的 **🐛 Debug** 按钮
- 调试面板会显示所有操作的详细日志

### 3. 测试添加到主页功能
1. 选择任意分类（例如 "设计"）
2. 鼠标悬停在任意书签卡片上
3. 点击卡片右上角的 **房子图标** 🏠

**期望的调试日志**：
\`\`\`
[Homepage] ➕ 添加书签到主页: xxx | ID: xxx
[Homepage] 📊 当前主页书签数: 1
[Homepage] 💾 开始保存布局，当前书签数: 1
[Homepage] 📝 准备保存: 1 个书签项
[ChromeStorage] 💾 saveHomepageLayout: 保存 1 个主页书签
[Homepage] ✅ 保存成功
[Homepage] ✅ 添加完成
\`\`\`

### 4. 测试并发添加（重要！）
**快速连续点击多个书签的房子图标**（例如连续点击5个），这是触发竞态条件的关键场景。

**期望的调试日志**：
\`\`\`
[Homepage] ➕ 添加书签到主页: bookmark1 | ID: xxx
[Homepage] 📊 当前主页书签数: 1
[Homepage] ➕ 添加书签到主页: bookmark2 | ID: xxx
[Homepage] 📊 当前主页书签数: 2
...
[ChromeStorage] 💾 saveHomepageLayout: 保存 5 个主页书签
[Homepage] ✅ 保存成功
\`\`\`

### 5. 测试持久化（关键！）
1. 添加5个书签到主页
2. 检查调试日志确认保存成功
3. **刷新页面**（F5 或 Cmd+R）
4. 打开调试面板，查看加载日志

**期望的调试日志**：
\`\`\`
[Homepage] 📂 开始加载主页布局...
[ChromeStorage] 📦 getHomepageLayout: 读取 5 个主页书签
[Homepage] ✅ 加载完成，主页书签数: 5
\`\`\`

5. **切换到主页视图**（点击左侧边栏的"主页"）
6. **验证**：之前添加的5个书签都应该显示在主页网格中

## 如何判断修复是否成功

### ✅ 成功的标志
- 添加书签时能看到完整的日志
- 保存日志显示正确的书签数量
- 刷新后加载日志显示相同的书签数量
- 主页网格中显示所有添加的书签

### ❌ 失败的标志
- 刷新后调试日志显示：`[ChromeStorage] 📭 getHomepageLayout: 存储为空`
- 或者加载的书签数少于保存的数量
- 或者主页网格中缺少书签

## 单元测试
已添加完整的单元测试，验证互斥锁的有效性：

\`\`\`bash
# 运行测试
npm run test:run

# 测试结果
✓ Chrome Storage 互斥锁测试 (6 tests)
  ✓ 有锁版本确保保存5个书签
  ✓ 互斥锁防止数据丢失
\`\`\`

## 技术细节

### 问题根因
`saveHomepageLayout` 没有互斥锁保护，当用户快速连续添加多个书签时，可能出现：
1. 操作1: 保存 [bookmark1]
2. 操作2: 保存 [bookmark1, bookmark2]（并发执行）
3. 操作1的保存覆盖了操作2的数据

### 修复方案
使用 `acquireWriteLock` 互斥锁，确保同一时间只有一个保存操作在执行：
\`\`\`typescript
async saveHomepageLayout(layout: HomepageLayout): Promise<void> {
  return this.acquireWriteLock(async () => {
    const serialized = { ... }
    await this.set(STORAGE_KEYS.HOMEPAGE_LAYOUT, serialized)
  })
}
\`\`\`

## 如果问题仍然存在
1. 导出完整的调试日志（复制调试面板中的所有日志）
2. 描述具体的操作步骤
3. 截图显示主页网格的状态

## 文件清单
- `src/utils/chrome-storage.ts` - 添加互斥锁和调试日志
- `src/stores/homepage.ts` - 添加调试日志
- `tests/unit/chrome-storage-lock.spec.ts` - 单元测试
- `dist-extension/` - 构建后的扩展（已包含所有修复）
