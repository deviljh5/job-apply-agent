# 零成本部署指南 (Zero-Cost Deployment Guide)

本指南帮助你在**完全免费**的前提下部署 Job Apply Agent。所有方案均使用免费层级服务。

---

## 免费方案概览

| 服务 | 费用 | 免费额度 |
|------|------|---------|
| **Vercel** | $0 | Hobby 计划无限流量 |
| **GitHub** | $0 | 公共仓库无限 |
| **Neon** | $0 | 500MB 存储，100 小时计算/月 |
| **OpenAI** | $0 | Demo 模式（无需 API Key） |
| **Google OAuth** | $0 | 免费创建 |
| **域名** | $0 | 使用 Vercel 子域名 |

**月费用：$0**

---

## 准备工作

你需要注册以下账户（全部免费）：

1. [GitHub](https://github.com) - 代码托管
2. [Vercel](https://vercel.com) - 应用部署
3. [Neon](https://neon.tech) - PostgreSQL 数据库
4. [Google Cloud](https://console.cloud.google.com) - OAuth 登录

---

## 第一步：配置数据库（Neon - 免费）

### 1.1 创建 Neon 账户
1. 访问 https://neon.tech
2. 使用 GitHub 账号注册
3. 创建新项目（免费层级自动启用）

### 1.2 创建数据库
1. 在 Neon Dashboard 点击 "New Project"
2. 选择 region（建议选 `us-east-1` 与 Vercel 接近）
3. 复制连接字符串：
   ```
   postgresql://username:password@host.neon.tech/database?sslmode=require
   ```

### 1.3 记录连接字符串
把连接字符串保存好，后面部署时需要填入 Vercel 环境变量。

---

## 第二步：配置 Google OAuth（免费）

### 2.1 创建 Google Cloud 项目
1. 访问 https://console.cloud.google.com
2. 创建新项目（名称随意，如 `job-apply-agent`）
3. 启用 **Google+ API** 和 **Gmail API**（仅读取权限）

### 2.2 配置 OAuth 同意屏幕
1. 导航到 "APIs & Services" > "OAuth consent screen"
2. 选择 "External"（允许任何人登录）
3. 填写应用信息：
   - 应用名称：Job Apply Agent
   - 用户支持邮箱：你的邮箱
   - 开发者联系邮箱：你的邮箱
4. 添加范围：
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`（可选，用于邮件同步）
5. 添加测试用户：填入你的 Gmail 地址

### 2.3 创建 OAuth 2.0 凭证
1. 导航到 "Credentials" > "Create Credentials" > "OAuth client ID"
2. 应用类型：Web application
3. 名称：Job Apply Agent Web
4. 授权重定向 URI：
   - 开发：`http://localhost:3000/api/auth/callback/google`
   - 生产：`https://your-project.vercel.app/api/auth/callback/google`
5. 点击创建，复制 **Client ID** 和 **Client Secret**

> **注意**：部署后需要回来更新生产环境的重定向 URI

---

## 第三步：推送代码到 GitHub（免费）

### 3.1 初始化 Git 仓库
```bash
cd /Users/hexin/WorkBuddy/2026-06-17-16-35-31/job-apply-agent

git init
git add .
git commit -m "Initial commit - Job Apply Agent"
```

### 3.2 创建 GitHub 仓库并推送

**方式 A：使用 GitHub CLI（推荐）**
```bash
# 安装 gh CLI（如果未安装）
# brew install gh  # macOS

gh auth login
gh repo create job-apply-agent --public --source=. --push
```

**方式 B：手动创建**
1. 访问 https://github.com/new
2. 创建公共仓库 `job-apply-agent`
3. 执行：
```bash
git remote add origin https://github.com/YOUR_USERNAME/job-apply-agent.git
git branch -M main
git push -u origin main
```

---

## 第四步：部署到 Vercel（免费）

### 4.1 导入项目
1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择你的 `job-apply-agent` 仓库
4. Vercel 自动检测到 Next.js 项目

### 4.2 配置环境变量
在部署配置页面，添加以下环境变量：

```
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-random-secret-at-least-32-characters
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
API_BASE_URL=https://your-project.vercel.app
```

> **免费提示**：如果不配置 OpenAI API Key，系统会自动进入 **Demo 模式**，所有 AI 功能使用模板生成，无需付费。

### 4.3 部署
点击 "Deploy"，等待 2-3 分钟完成构建。

### 4.4 配置数据库
部署完成后，在本地运行迁移：
```bash
# 设置环境变量指向生产数据库
export DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"

npx prisma migrate deploy
```

或者使用 Vercel CLI：
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

---

## 第五步：验证部署

访问以下链接验证：

| 链接 | 验证内容 |
|------|---------|
| `https://your-project.vercel.app/api/health` | 服务健康状态 |
| `https://your-project.vercel.app/login` | 登录页面 |
| `https://your-project.vercel.app/dashboard` | Dashboard（登录后） |
| `https://your-project.vercel.app/jobs` | 职位浏览 |

---

## 第六步：更新 Google OAuth 重定向 URI（重要）

部署后，回到 Google Cloud Console：
1. 找到 OAuth 2.0 凭证
2. 编辑 "Authorized redirect URIs"
3. 添加：`https://your-project.vercel.app/api/auth/callback/google`
4. 保存

---

## Demo 模式说明（零 AI 成本）

如果不配置 `OPENAI_API_KEY`，系统会自动进入 Demo 模式：

| 功能 | Demo 模式行为 |
|------|--------------|
| 简历解析 | 使用预置的模板数据 |
| 简历定制 | 基于职位描述生成模板化内容 |
| Cover Letter | 生成通用模板求职信 |
| 邮件分类 | 基于关键词匹配分类 |
| ATS 评分 | 基于关键词匹配计算 |

**何时切换到真实 AI？**
- 当你有 OpenAI API Key 时（新账号有 $5 免费额度）
- 将 `OPENAI_API_KEY` 添加到 Vercel 环境变量
- 重新部署即可

---

## 后续升级路径（可选）

### 1. 启用真实 AI（$5-20/月）
```
1. 注册 OpenAI：https://platform.openai.com
2. 新用户有 $5 免费额度
3. 将 API Key 添加到 Vercel 环境变量
4. 重新部署
```

### 2. 添加自定义域名（$0-12/年）
```
1. 购买域名（如 Namecheap ~$9/年）
2. 在 Vercel 添加域名
3. 更新 NEXTAUTH_URL 和 NEXT_PUBLIC_APP_URL
4. 更新 Google OAuth 重定向 URI
```

### 3. 升级到 Vercel Pro（$20/月）
当你需要：
- 更长的函数执行时间（> 10秒）
- 更多的并发构建
- 团队协作者

---

## 常见问题

### Q: 免费层级够不够用？
**A: 足够个人使用和演示。**
- Vercel Hobby: 无限流量，足够个人项目
- Neon Free: 500MB 存储，约 1000 条职位记录
- Demo 模式: 零 AI 成本，功能完整

### Q: 数据库满了怎么办？
**A: 清理旧数据或升级到 Neon 付费版（$19/月起）。**

### Q: 可以部署到其他地方吗？
**A: 可以。支持任何支持 Node.js 的平台：**
- Railway（免费额度）
- Render（免费 Web Service）
- Fly.io（免费额度）
- 自有服务器（Docker 部署）

### Q: Chrome 扩展如何更新 API 地址？
**A: 修改 `chrome-extension/dist/manifest.json`：**
```json
"host_permissions": [
  "https://your-project.vercel.app/*"
]
```
然后重新加载扩展。

---

## 费用对比

| 方案 | 月费用 | 适用场景 |
|------|--------|---------|
| **完全免费** | $0 | 个人使用、演示、MVP |
| 真实 AI | $5-20 | 需要高质量 AI 生成 |
| 生产级 | $40-60 | 多用户、高流量 |

---

## 一键部署按钮（可选）

如果你想让其他人也能一键部署，可以添加 Deploy 按钮到 README：

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/job-apply-agent)
```

---

*部署指南版本: 1.0 - 零成本方案*
