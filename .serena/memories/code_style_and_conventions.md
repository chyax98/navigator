# 代码风格和约定

## TypeScript 配置
- **严格模式**: 启用 strict
- **未使用变量检查**: 启用 noUnusedLocals 和 noUnusedParameters
- **Fall-through 检查**: 启用 noFallthroughCasesInSwitch
- **路径别名**: `@/*` 映射到 `src/*`

## ESLint 规则
- 使用 ESLint 推荐配置
- Vue 3 推荐规则
- TypeScript 推荐规则

### 特殊规则
- `vue/multi-word-component-names`: off - 允许单词组件名
- `@typescript-eslint/no-explicit-any`: off - 允许使用 any
- `@typescript-eslint/no-unused-vars`: warn - 未使用变量仅警告，忽略 `_` 开头的参数

## 命名约定
- **组件**: PascalCase（如 `BookmarkCard.vue`）
- **文件夹**: kebab-case（如 `bookmark-card/`）
- **变量和函数**: camelCase（如 `showModal`, `handleClick`）
- **类型和接口**: PascalCase（如 `Bookmark`, `Category`）
- **常量**: UPPER_SNAKE_CASE（如 `DEFAULT_WIDTH`）

## 组件结构
遵循 Vue 3 Composition API 风格：
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 导入
// Props/Emits 接口定义
// 响应式状态
// 计算属性
// 方法
// 生命周期钩子
</script>

<style scoped>
/* 样式 */
</style>
```

## 代码组织
- 按功能模块组织，而非文件类型
- 组件按职责分类：layout、common、bookmark、category、homepage、settings
- 服务层：services/ 目录存放业务逻辑
- 类型定义：types/ 目录统一管理
- 状态管理：stores/ 目录使用 Pinia

## 注释规范
- 使用 JSDoc 风格注释复杂函数
- 重要业务逻辑必须添加注释
- 避免无意义的注释

## 导入顺序
1. Vue 相关导入
2. 第三方库导入
3. 组件导入
4. 工具函数导入
5. 类型导入
6. 样式导入