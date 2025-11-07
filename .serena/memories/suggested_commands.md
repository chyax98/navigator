# 建议的开发命令

## 日常开发命令

### 启动开发服务器
```bash
npm run dev
```
- 启动 Vite 开发服务器
- 自动打开浏览器访问 http://localhost:3000
- 支持热模块替换 (HMR)

### 类型检查
```bash
npm run type-check
# 或
npx vue-tsc --noEmit
```
- 运行 TypeScript 类型检查
- 不生成输出文件
- **建议**: 每次提交前运行

### 代码检查和修复
```bash
npm run lint
```
- 运行 ESLint 检查
- 自动修复可修复的问题
- 检查 .vue, .js, .ts, .jsx, .tsx 文件

### 构建生产版本
```bash
npm run build
```
- 运行类型检查
- 构建生产版本到 dist/ 目录
- 启用代码压缩和优化
- 移除 console 和 debugger

### 预览生产构建
```bash
npm run preview
```
- 预览生产构建结果
- 用于验证构建后的应用

## Git 工作流命令

### 查看状态
```bash
git status
```

### 查看当前分支
```bash
git branch
```

### 查看变更
```bash
git diff
```

### 提交前检查
```bash
npm run type-check && npm run lint
```

## 测试命令

### 运行端到端测试
```bash
npx playwright test
```

## 系统工具命令 (macOS)

### 查看文件
```bash
ls -la
cat <file>
```

### 搜索文件
```bash
find . -name "*.vue"
```

### 搜索内容
```bash
grep -r "pattern" src/
```

### 进程管理
```bash
ps aux | grep node
kill -9 <pid>
```

## 任务完成检查清单

完成任务后，按顺序执行：
1. `npm run type-check` - 确保类型安全
2. `npm run lint` - 确保代码规范
3. `git diff` - 检查变更内容
4. `git add .` - 暂存变更
5. `git commit -m "描述性消息"` - 提交变更