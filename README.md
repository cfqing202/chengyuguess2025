# 猴哥成语大冲关

抖音/快手/ vivo / oppo 小游戏

## 项目结构

```
├── index.html           # 游戏主入口文件（可在浏览器和抖音开发者工具中运行）
├── game.json            # 游戏配置文件
├── project.config.json  # 抖音小游戏项目配置
├── supabase/
│   ├── schema.sql       # 数据库表结构（需要在 Supabase 后台执行）
│   ├── supabase-client.js # Supabase API 客户端
│   └── idioms-data.js  # 成语题库数据
├── demo需求文档/
│   ├── 猴哥成语大冲关-功能文档.pdf
│   ├── demo-猴哥成语大冲关-前端开发文档.pdf
│   └── demo-猴哥成语大冲关-后台开发功能文档.pdf
└── 前端代码文件/
    └── idiom-game-tt/  # 原始前端代码
```

## 快速开始

### 方式一：浏览器预览（推荐用于 Demo 测试）

1. 直接用浏览器打开 `index.html` 文件
2. 游戏数据会自动保存到浏览器 localStorage

### 方式二：GitHub Pages 部署

1. 将项目推送到 GitHub 仓库
2. 在 GitHub 仓库设置中启用 GitHub Pages
3. 选择 `main` 分支作为源
4. 访问生成的 URL 即可预览

### 方式三：抖音开发者工具

1. 下载并安装[抖音开发者工具](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/download)
2. 使用开发者工具打开项目目录
3. 点击预览即可在抖音中预览

## 后端配置（Supabase）

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册并登录
2. 创建新项目，记住 Project URL 和 Anon Key

### 2. 执行数据库脚本

1. 在 Supabase 控制台打开 SQL Editor
2. 复制 `supabase/schema.sql` 内容并执行

### 3. 配置前端连接

编辑 `supabase/supabase-client.js`，填入你的 Supabase URL 和 Key：

```javascript
const SUPABASE_URL = '你的Project URL';
const SUPABASE_ANON_KEY = '你的Anon Key';
```

## 游戏功能

- **成语猜猜**：根据汉字组合猜成语
- **每日挑战**：每天完成 5 轮挑战可获得额外奖励
- **身份系统**：根据连胜次数提升身份（童生→秀才→举人→...→皇帝）
- **礼包兑换**：使用积分兑换实物奖品
- **贡献值系统**：看广告可提升贡献值

## 技术栈

- 前端：Canvas 2D 游戏引擎
- 后端：Supabase（PostgreSQL + Edge Functions）
- 部署：GitHub Pages / 抖音小游戏平台
