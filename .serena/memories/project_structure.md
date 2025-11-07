# 项目结构

## 目录结构概览

```
navigator/
├── src/                      # 源代码目录
│   ├── components/          # Vue 组件
│   │   ├── layout/         # 布局组件（Header, Sidebar, AppLayout）
│   │   ├── common/         # 通用组件（SearchBox）
│   │   ├── bookmark/       # 书签相关组件
│   │   ├── category/       # 分类相关组件
│   │   ├── homepage/       # 主页相关组件
│   │   └── settings/       # 设置相关组件
│   ├── views/              # 页面视图
│   ├── stores/             # Pinia 状态管理
│   │   ├── bookmark.ts    # 书签状态
│   │   ├── config.ts      # 配置状态
│   │   ├── homepage.ts    # 主页状态
│   │   └── plugin.ts      # 插件状态
│   ├── services/           # 业务逻辑服务
│   │   ├── ai/            # AI 相关服务
│   │   └── metadata.ts    # 元数据提取服务
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── router/             # 路由配置
│   ├── styles/             # 全局样式
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── tests/                   # 测试文件
├── docs/                    # 文档
├── claudedocs/             # Claude 相关文档
├── .serena/                # Serena 记忆文件
├── dist/                   # 构建输出目录（gitignored）
├── node_modules/           # 依赖包（gitignored）
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
├── .eslintrc.cjs           # ESLint 配置
├── playwright.config.ts    # Playwright 测试配置
├── CLAUDE.md               # Claude 项目说明
└── .env.example            # 环境变量示例
```

## 核心目录说明

### src/components/
按功能模块组织的组件：
- **layout/**: 应用布局相关（AppLayout, TheHeader, TheSidebar, CategoryTree, CategoryNode）
- **common/**: 可复用通用组件（SearchBox）
- **bookmark/**: 书签管理组件（BookmarkCard, BookmarkFormModal）
- **category/**: 分类管理组件
- **homepage/**: 主页网格布局组件（HomepageGrid, HomepageBookmarkCard, GridSettingsPanel）
- **settings/**: 设置相关组件

### src/stores/
Pinia 状态管理：
- **bookmark.ts**: 书签和分类的增删改查、拖拽状态、搜索
- **config.ts**: 应用配置（主题、AI 设置、侧边栏状态）
- **homepage.ts**: 主页网格布局配置
- **plugin.ts**: 插件系统（如果有）

### src/services/
业务逻辑服务层：
- **ai/**: AI 增强相关服务（分类推荐、描述生成）
- **metadata.ts**: 网页元数据提取（LinkPreview API 集成）

### src/types/
TypeScript 类型定义：
- 书签、分类、标签、配置等类型定义

## 关键文件

- **src/main.ts**: 应用入口，初始化 Vue、Pinia、Router
- **src/App.vue**: 根组件，应用主题管理
- **vite.config.ts**: Vite 构建配置，路径别名、代码分割
- **tsconfig.json**: TypeScript 编译配置
- **.eslintrc.cjs**: ESLint 规则配置
- **CLAUDE.md**: AI 辅助开发的项目文档