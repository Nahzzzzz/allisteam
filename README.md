# AllieTeam

跨领域「找搭子 / 找队友」平台。发布一个结构化招募局，别人报名，发起人审批，成团后在局内聊天，活动结束后互评并积累信誉分。

当前阶段：**M0–M5**（账号、资料、发局、列表筛选、报名与审批、局内聊天、互评与信誉分、举报与极简后台、局自动结束）。业务规则见 `PRD.md`，技术方案见 `Tech Design.md`，工程约定见 `AGENTS.md`。

## 结构

```
apps/api        NestJS 11 + Prisma 6，端口 3001，前缀 /api/v1
apps/web        Next.js 16（App Router），端口 3000
packages/shared 前后端共用的枚举、zod schema、错误码、类型
```

## 本地准备

```powershell
npm install
```

环境变量（不入库）：

- `apps/api/.env`：参照 `apps/api/.env.example`，需要 Neon 的 `DATABASE_URL`（pooled）与 `DIRECT_URL`（直连，迁移用）、Upstash 的 `REDIS_URL`、`JWT_ACCESS_SECRET`
- `apps/web/.env.local`：参照 `apps/web/.env.example`

生成一个 `JWT_ACCESS_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

集成测试需要一个独立的数据库：在 Neon 同一项目里再建一个 `allisteam_test`，把直连串写进 `apps/api/.env.test` 的 `TEST_DATABASE_URL`，然后 `npm run -w @allisteam/api prisma:deploy`（用测试库的 `DATABASE_URL`）建表。没有配置时集成测试会自动跳过，只跑单元测试。

## 数据库

```powershell
npm run -w @allisteam/api prisma:generate    # 生成 client
npm run -w @allisteam/api prisma:migrate     # 开发迁移（读取 DIRECT_URL）
npm run -w @allisteam/api prisma:seed        # 游戏字典 + 20 条演示局
```

## 常用命令

```powershell
npm run dev                     # 同时起 api 与 web（先构建 shared）
npm run -w @allisteam/api prisma:migrate   # 开发迁移
npm run -w @allisteam/api prisma:seed      # 游戏字典与演示数据
npm run lint
npm run typecheck
npm run -w @allisteam/api test
npm run e2e
npm run ci
```

E2E 首次运行前装一次浏览器；如果下载不动，可以改用系统 Edge（Windows 自带）：

```powershell
cd apps/web
npx playwright install chromium
# 或者
$env:PLAYWRIGHT_CHANNEL="msedge"; npm run e2e
```

## 文档

- `PRD.md`：范围、用户故事、业务规则、指标
- `Tech Design.md`：架构、数据模型、接口契约、部署
- `AGENTS.md`：编码与测试约定（改代码前先读）
