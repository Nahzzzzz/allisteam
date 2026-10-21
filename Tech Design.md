# Tech Design：AllieTeam

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 对应产品文档 | `PRD.md` |
| 目标版本 | V1（游戏领域）+ V1.5（演唱会、旅游，已实现） |

---

## 1. 目标与约束

### 1.1 设计目标

1. 游戏领域是 V1 主场景；演唱会、旅游按同一套扩展机制落地（`ConcertInfo` / `TravelInfo`），业务层不复制一套状态机。
2. 单机可跑、单人可维护：本地一条命令起环境，生产环境用托管服务，不做 K8s。
3. 关键一致性点（名额、成团）由数据库保证，不依赖应用层锁。
4. 前后端共享类型与校验规则，避免接口字段漂移。

### 1.2 当前开发环境的实际情况（已核实）

| 项 | 实测结果 | 影响 |
| --- | --- | --- |
| 操作系统 | Windows 10.0.26200 | 脚本需兼容 PowerShell；路径含空格要加引号 |
| Node.js | v24.21.0 | 满足 Next 16 / NestJS 11 / Prisma 6 要求 |
| npm | 11.19.0 | 用 npm workspaces 做 monorepo；项目脚本统一用 npm |
| pnpm | 未安装 | 若要用需先 `corepack enable pnpm`，非必需 |
| Docker | 未安装 | **本地无法用 docker-compose 起 Postgres/Redis**，见 §1.3 |
| PostgreSQL / Redis | 本地均未安装 | 同上 |
| git | 2.51.2 | 可直接初始化仓库 |

### 1.3 本地依赖的两条路线（必须先选一条）

**路线 A：安装 Docker Desktop**
一条 `docker compose up -d` 起 Postgres 16 + Redis 7 + MinIO，环境可复制、可丢弃，团队协作一致。代价是首次安装与 WSL2 依赖。

**路线 B：零安装，全部用云托管免费额度**
PostgreSQL 用 Neon / Supabase，Redis 用 Upstash，对象存储用 Cloudflare R2。不用装任何东西，立刻能写代码；代价是依赖网络，离线不可开发，冷启动有延迟。

两条路线对代码完全透明（只差 `.env` 里的连接串）。**本项目当前采用路线 B**：本机没有 Docker 与 PostgreSQL，`.env` 直接指向 Neon + Upstash，README 的命令也按 B 写。装好 Docker 后可以切到 A，只改环境变量，代码不变。

## 2. 技术栈

下表是脚手架落地后的实际版本（`package.json` 为唯一事实来源）：

| 层 | 选型 | 版本 | 选择理由 | 备选 |
| --- | --- | --- | --- | --- |
| 前端框架 | Next.js（App Router）+ React + TypeScript | next 16.4.2 / react 19 | 路由、SSR、构建一体化；移动端优先的 PWA 容易加 | Remix、Vite + React Router |
| UI | Tailwind CSS + 手写 shadcn 风格组件 | tailwindcss 4 | 无运行时样式库、组件可改源码，适合快速出移动端界面 | Ant Design Mobile |
| 数据层 | TanStack Query | 5.x | 缓存失效、乐观更新、加载态处理成熟 | SWR |
| 表单与校验 | react-hook-form + zod（复用 `packages/shared`） | 7.x / 4.6.7 | 前后端同一份 schema | — |
| 后端框架 | NestJS（REST + WebSocket 网关） | 11.2.7 | 模块化、DI、守卫/拦截器/管道齐全，适合练后端分层 | Fastify + tRPC |
| ORM | Prisma | 6.19.3 | 迁移、类型生成、事务 API 好用 | Drizzle |
| 数据库 | PostgreSQL 16（Neon 托管） | — | 事务、约束、部分索引、`pg_trgm`；后续加 PostGIS 做地理筛选 | — |
| 缓存 | Redis 7（Upstash 托管） | ioredis 5 | 限流计数、在线状态、Socket.IO adapter | — |
| 实时 | Socket.IO 4（Redis adapter） | socket.io 4.8.4、@nestjs/websockets / @nestjs/platform-socket.io 11.2.7、@socket.io/redis-adapter 8.3.0 | 房间、重连、ack 语义开箱即用；Nest 侧固定 11.x（12.x 的 `@nestjs/websockets` 要求 `@nestjs/common@12`） | 原生 ws + 自建重连 |
| 对象存储 | MinIO（本地）/ Cloudflare R2（生产） | 暂缓 | S3 协议，代码零改动切换 | 阿里云 OSS |
| 鉴权 | 自建 JWT（access）+ 不透明刷新令牌 | @nestjs/jwt 12 | 可控、可撤销、便于理解会话安全 | Auth.js、Clerk |
| 密码哈希 | bcryptjs | 3.x | 纯 JS，避免 Windows 原生编译 | argon2 |
| 日志/监控 | pino + Sentry | 9.x | 结构化日志、异常聚合 | OpenTelemetry |
| 测试 | Vitest + Supertest + Playwright | vitest 3 / playwright 1.55 | 集成测试跑真实数据库，E2E 覆盖主闭环 | Jest |
| 语言 | TypeScript | 6.0.3 | 统一版本，Nest 11 的 schematics 兼容 `>=4.8.2` | — |
| 包管理 | npm workspaces | npm 11 | 环境已装 npm 11，无额外安装成本 | pnpm |

**Prisma 版本取舍**：执行脚手架时 npm `latest` 指向 `8.0.0-rc`，而 7.x 起改为 ESM-only、必须使用 driver adapter 与 `prisma.config.ts`；NestJS 默认 CJS 构建，直接采用会在模块系统上消耗时间。因此固定 `6.19.3`（`prisma-client-js`、CJS、`datasource.directUrl` 可用）。升级 7/8 时单独开一个变更：改用 ESM 构建、接入 driver adapter、迁移脚本改走 `prisma.config.ts`，业务代码不受影响。

**NestJS 版本取舍**：npm 上 `@nestjs/common@12`、`@nestjs/core@12`、`@nestjs/config@12`、`@nestjs/jwt@12` 都已是纯 ESM（`"type": "module"`，无 CJS 出口），与本项目 Prisma 6 / Nest CLI 的 CJS 产物混用会在 Node16 解析下报 `TS1479`。因此固定 `@nestjs/common|core|platform-express@11.2.7`、`@nestjs/config@4.0.4`、`@nestjs/jwt@11.0.2`（均为 CJS）。升级到 Nest 12 需要把 API 整体切到 ESM（`"type": "module"`、相对导入补 `.js` 后缀，或改用打包器），属于独立变更。

## 3. 系统架构

```
┌───────────────────────────────────────────────┐
│  Web (Next.js, PWA, 移动端优先)                │
│  ├─ 页面/路由：列表、详情、发布、我的、聊天     │
│  └─ 数据层：TanStack Query + zod（shared）     │
└──────────┬───────────────────────┬────────────┘
           │ HTTPS /api/v1         │ WSS /ws
           ▼                       ▼
┌───────────────────────────────────────────────┐
│  API (NestJS, 无状态，可水平扩容)              │
│  ├─ modules: auth users posts applications    │
│  │           chat reviews reports notify      │
│  ├─ common: JWT 守卫、所有权守卫、限流、       │
│  │           游标分页、异常过滤器、日志拦截器  │
│  └─ jobs: 局自动结束、提醒（@nestjs/schedule） │
└───┬──────────────┬──────────────┬─────────────┘
    │              │              │
    ▼              ▼              ▼
┌────────┐  ┌───────────┐  ┌──────────────┐
│Postgres│  │  Redis    │  │ S3/MinIO     │
│ 主数据  │  │ 限流/在线  │  │ 图片         │
│ 约束/事务│  │ /Socket 广 │  │              │
└────────┘  │ 播 adapter │  └──────────────┘
            └───────────┘
```

**不做的事**：不做微服务拆分、不做 CQRS、不做事件总线。V1 是模块化单体（modular monolith），模块间只通过 service 接口调用。

## 4. 仓库结构

```
allisteam/
├─ package.json                 # npm workspaces 根，统一脚本
├─ packages/
│  └─ shared/                   # 枚举、zod schema、DTO 类型、错误码
│     ├─ src/enums.ts
│     ├─ src/schemas/*.ts
│     ├─ src/errors.ts
│     └─ package.json           # 用 tsup 构建，输出 CJS + ESM + d.ts
├─ apps/
│  ├─ api/                      # NestJS
│  │  ├─ prisma/schema.prisma
│  │  ├─ prisma/migrations/
│  │  ├─ src/main.ts
│  │  ├─ src/app.module.ts
│  │  ├─ src/modules/*          # 每模块 controller/service/dto
│  │  └─ test/                  # 集成测试与并发测试
│  └─ web/                      # Next.js
│     ├─ app/
│     ├─ components/
│     ├─ lib/api.ts             # fetch 封装 + 令牌刷新
│     └─ e2e/                   # Playwright
└─ AGENTS.md
```

**模块内部结构（以 posts 为例）**：

```
modules/posts/
├─ posts.module.ts
├─ posts.controller.ts      # 只做参数解析与调用 service
├─ posts.service.ts         # 业务规则、事务
├─ posts.repository.ts      # 仅 Prisma 查询，返回 domain 对象
├─ dto/                     # zod schema → DTO（从 shared 导出）
└─ posts.service.spec.ts
```

约定：controller 不写业务判断；跨模块只能调用对方 service；`postId` 一类的所有权校验放在 service 内部，不靠前端。

## 5. 数据模型

### 5.1 建模策略

- **一张 `Post` 基表 + 每个领域一张扩展表**（`GameInfo` / `ConcertInfo` / `TravelInfo`），扩展表主键即 `postId`。
- 用表而不是 JSONB：领域属性需要独立索引、范围筛选与类型约束（如段位区间、预算区间）。JSONB 在「按段位筛选」这类查询上会退化成全表扫描。
- `Post` 上保留一个 `gameId` 反范式字段，作为最热筛选条件（按游戏筛选）的单表索引入口，写入时与 `GameInfo.gameId` 在同一事务内保持一致。这是唯一的冗余，收益是列表查询不做 join。

### 5.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Domain           { GAME CONCERT TRAVEL }
enum Platform         { PC PLAYSTATION XBOX SWITCH MOBILE }
enum ConcertSeat      { STAND INNER UNDECIDED }
enum TravelTransport  { PLANE TRAIN SELF_DRIVE BUS ANY }
enum TravelIntensity  { RELAXED MODERATE INTENSE }
enum PostStatus       { OPEN FULL CLOSED CANCELLED }
enum ApplyStatus      { PENDING APPROVED REJECTED WITHDRAWN LEFT }
enum MemberRole       { HOST MEMBER }
enum MessageType      { TEXT SYSTEM }
enum UserStatus       { ACTIVE SUSPENDED DELETED }
enum ReportTargetType { POST USER MESSAGE }
enum ReportReason     { FAKE_INFO HARASSMENT AD SPAM FRAUD OTHER }
enum ReportStatus     { PENDING REVIEWING RESOLVED REJECTED }
enum NotificationType {
  APPLICATION_RECEIVED
  APPLICATION_APPROVED
  APPLICATION_REJECTED
  POST_FULL
  POST_CANCELLED
  POST_REMINDER
  NEW_MESSAGE
  REVIEW_RECEIVED
  REPORT_RESULT
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  phone        String?    @unique
  nickname     String
  avatarKey    String?
  bio          String?
  city         String?
  trustScore   Int        @default(60)
  reviewCount  Int        @default(0)
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  refreshTokens  RefreshToken[]
  gameProfiles   GameProfile[]
  posts          Post[]          @relation("AuthoredPosts")
  applications   Application[]   @relation("Applicant")
  memberships    PostMember[]
  messages       Message[]
  reviewsGiven   Review[]        @relation("ReviewFrom")
  reviewsGot     Review[]        @relation("ReviewTo")
  notifications  Notification[]
  reportsMade    Report[]        @relation("Reporter")
  reportsHandled Report[]        @relation("Handler")
  blocksMade     Block[]         @relation("Blocker")
  blocksReceived Block[]         @relation("Blocked")

  @@index([status, createdAt])
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique          // sha256(原始 token)，不存明文
  familyId  String                     // 轮换家族，用于复用检测
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
  @@index([familyId])
}

model Game {
  id        String  @id @default(cuid())
  name      String  @unique
  coverKey  String?
  sortOrder Int     @default(0)
  isActive  Boolean @default(true)

  profiles GameProfile[]
  posts    Post[]
}

model GameProfile {
  id        String   @id @default(cuid())
  userId    String
  gameId    String
  platform  Platform
  rankText  String?
  voiceOk   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  game Game @relation(fields: [gameId], references: [id])

  @@unique([userId, gameId, platform])
  @@index([gameId, platform])
}

model Post {
  id           String     @id @default(cuid())
  authorId     String
  domain       Domain     @default(GAME)
  title        String
  description  String
  city         String?
  startTime    DateTime
  endTime      DateTime?
  capacity     Int
  memberCount  Int        @default(1)
  status       PostStatus @default(OPEN)
  gameId       String?                        // 反范式：最热筛选条件
  coverKey     String?
  cancelReason String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  author       User         @relation("AuthoredPosts", fields: [authorId], references: [id])
  game         Game?        @relation(fields: [gameId], references: [id])
  gameInfo     GameInfo?
  concertInfo  ConcertInfo?
  travelInfo   TravelInfo?
  applications Application[]
  members      PostMember[]
  messages     Message[]
  reviews      Review[]

  @@index([domain, status, startTime])
  @@index([gameId, status, startTime])
  @@index([authorId, createdAt(sort: Desc)])
  @@index([status, startTime])               // 定时任务扫描结束过期局
  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin, map: "Post_title_trgm_idx")
}

model GameInfo {
  postId    String   @id
  gameId    String
  platform  Platform
  mode      String?
  rankMin   String?
  rankMax   String?
  needVoice Boolean  @default(false)

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([gameId, platform])
}

/// 演唱会扩展表：场次时间复用 Post.startTime；票务只做同行匹配，不做转售。
model ConcertInfo {
  postId     String      @id
  artist     String
  tourName   String?
  venue      String?
  seatType   ConcertSeat @default(UNDECIDED)
  hasTicket  Boolean     @default(true)
  ticketNote String?

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([artist])
  @@index([artist(ops: raw("gin_trgm_ops"))], type: Gin, map: "ConcertInfo_artist_trgm_idx")
}

/// 旅游扩展表：Post.startTime / endTime 分别是出发与返程日期。
model TravelInfo {
  postId      String          @id
  destination String
  budgetMin   Int?
  budgetMax   Int?
  transport   TravelTransport @default(ANY)
  intensity   TravelIntensity @default(MODERATE)
  shareRoom   Boolean         @default(false)

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([destination(ops: raw("gin_trgm_ops"))], type: Gin, map: "TravelInfo_destination_trgm_idx")
  @@index([budgetMax])
}

model Application {
  id           String      @id @default(cuid())
  postId       String
  userId       String
  message      String?
  status       ApplyStatus @default(PENDING)
  rejectReason String?
  decidedById  String?
  decidedAt    DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation("Applicant", fields: [userId], references: [id])

  @@unique([postId, userId])                 // 防重复报名
  @@index([postId, status, createdAt])
  @@index([userId, status, createdAt(sort: Desc)])
}

model PostMember {
  postId   String
  userId   String
  role     MemberRole @default(MEMBER)
  joinedAt DateTime   @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([postId, userId])
  @@index([userId, joinedAt(sort: Desc)])
}

model Message {
  id        String      @id @default(cuid())
  postId    String
  senderId  String?                          // null = 系统消息
  type      MessageType @default(TEXT)
  content   String
  createdAt DateTime    @default(now())

  post   Post  @relation(fields: [postId], references: [id], onDelete: Cascade)
  sender User? @relation(fields: [senderId], references: [id])

  @@index([postId, createdAt, id])
}

model Review {
  id        String   @id @default(cuid())
  postId    String
  fromId    String
  toId      String
  rating    Int
  comment   String?
  tags      String[] @default([])
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  from User @relation("ReviewFrom", fields: [fromId], references: [id])
  to   User @relation("ReviewTo", fields: [toId], references: [id])

  @@unique([postId, fromId, toId])           // 同一局每人对每人一次
  @@index([toId, createdAt(sort: Desc)])
}

model Report {
  id          String           @id @default(cuid())
  reporterId  String
  targetType  ReportTargetType
  targetId    String
  reason      ReportReason
  detail      String?
  status      ReportStatus     @default(PENDING)
  handledById String?
  handledAt   DateTime?
  createdAt   DateTime         @default(now())

  reporter User  @relation("Reporter", fields: [reporterId], references: [id])
  handled  User? @relation("Handler", fields: [handledById], references: [id])

  @@index([status, createdAt])
  @@index([targetType, targetId])
  @@index([reporterId, targetType, targetId, createdAt(sort: Desc)])  // 24h 重复举报去重
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  payload   Json
  readAt    DateTime?
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt(sort: Desc)])
}

model Block {
  blockerId String
  blockedId String
  createdAt DateTime @default(now())

  blocker User @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)

  @@id([blockerId, blockedId])
}
```

### 5.3 数据库级约束（Prisma schema 表达不了，写在 migration 里手写 SQL）

```sql
ALTER TABLE "Post" ADD CONSTRAINT post_capacity_range CHECK (capacity BETWEEN 2 AND 20);
ALTER TABLE "Post" ADD CONSTRAINT post_member_count_range CHECK ("memberCount" >= 1 AND "memberCount" <= capacity);
ALTER TABLE "Review" ADD CONSTRAINT review_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "TravelInfo" ADD CONSTRAINT travel_budget_range
  CHECK ("budgetMin" IS NULL OR "budgetMax" IS NULL OR "budgetMin" <= "budgetMax");
```

这四条 CHECK 是最后一道防线：即使应用层有 bug，也不会出现「名额 5 人却有 6 名成员」「评分 8 星」或「预算下限高于上限」的脏数据。

标题模糊搜索用的 `pg_trgm` GIN 索引写在 `Post` 的 `@@index(... type: Gin, map: "Post_title_trgm_idx")` 里（`pg_trgm` 扩展由 `20261020160001_constraints` 创建）。声明进 schema 是必须的：只在 migration 里手写 SQL 时，`prisma migrate dev` 会把它当成多余索引生成 `DROP INDEX`。

## 6. 核心机制

### 6.1 领域扩展（为什么以后加领域不用改业务层）

新增演唱会只需要：新建 `ConcertInfo` 表（`postId` 主键）、往 `shared` 的 zod schema 里加一个 `concertPayload` 分支、在 `PostsService.create` 的分支里多一个 `case`、列表筛选加几个可选参数。报名、成团、聊天、评价、通知全部复用，因为它们只认 `Post` 与 `PostMember`。

### 6.2 名额与成团：不用锁、不超卖

**错误做法**：先 `findUnique` 查 `memberCount`，再 `update` 加一。两个请求同时通过检查，就会超卖。

**正确做法**：把「是否还有名额」放进 `UPDATE` 的 `WHERE` 里，由数据库行锁保证原子性。Prisma 用 `updateMany` 或原生 SQL：

```ts
// applications.service.ts
await prisma.$transaction(async (tx) => {
  // 1. 仅当申请仍为 PENDING 时才能通过（防重复点击）
  const decided = await tx.application.updateMany({
    where: { id: applicationId, status: 'PENDING' },
    data: { status: 'APPROVED', decidedAt: new Date(), decidedById: hostId },
  });
  if (decided.count === 0) throw new ConflictException('ALREADY_DECIDED');

  // 2. 原子占用名额：无返回行说明已满
  const rows = await tx.$queryRaw<{ id: string; memberCount: number; capacity: number; status: string }[]>`
    UPDATE "Post"
    SET "memberCount" = "memberCount" + 1,
        "status" = CASE WHEN "memberCount" + 1 >= capacity THEN 'FULL'::"PostStatus" ELSE "status" END,
        "updatedAt" = now()
    WHERE id = ${postId}
      AND "memberCount" < capacity
      AND status = 'OPEN'
    RETURNING id, "memberCount", capacity, status
  `;
  if (rows.length === 0) throw new ConflictException('POST_FULL');

  // 3. 建立成员关系 + 通知
  await tx.postMember.create({ data: { postId, userId, role: 'MEMBER' } });
  await tx.notification.create({ data: { userId, type: 'APPLICATION_APPROVED', payload: { postId } } });
});
```

要点：
- 第 2 步的 `CASE` 让「满员置 FULL」与「占用名额」在一条语句内完成，避免两次写之间出现窗口。
- `status = 'OPEN'` 的字面量会被隐式转换为枚举，若 Prisma 生成的枚举名不同，改写成 `'OPEN'::"PostStatus"` 显式转换。
- 同一事务内的三步要么全成要么全败，配合 `Application` 唯一索引，重复审批与重复报名都被挡住。

### 6.3 游标分页

列表按 `startTime ASC, id ASC` 排序（首个可用、最快开始），游标是 `base64url(JSON.stringify({ t, id }))`：

```ts
where: cursor ? {
  OR: [
    { startTime: { gt: cursor.t } },
    { startTime: cursor.t, id: { gt: cursor.id } },
  ],
} : {}
```

客户端每次多取 1 条判断 `hasMore`，返回 `nextCursor`。**不用 offset**：数据增长后 offset 分页会随页码变慢，且插入新数据时出现重复/漏项。

消息列表是反方向：按 `createdAt DESC, id DESC` 取最近 N 条，向上翻页用 `lt` 游标。

### 6.4 鉴权与会话

| 令牌 | 形式 | 有效期 | 存放 | 用途 |
| --- | --- | --- | --- | --- |
| Access Token | JWT（HS256，载荷仅 `sub`、`jti`） | 30 分钟 | 前端内存（Zustand） | 调 API、WebSocket 握手 |
| Refresh Token | 32 字节随机串，服务端存 sha256 | 14 天 | httpOnly + Secure + SameSite=Lax Cookie，路径限 `/api/v1/auth` | 换新 access token |

- 刷新即轮换：旧 token 立即作废，新 token 写入同一 `familyId`。
- 复用检测：已作废的 refresh token 再次出现，则吊销整个 `familyId` 下的所有令牌并强制重新登录。
- 因为 access token 在内存中，**V1 前端不渲染需要登录态的 SSR 页面**（我的局、聊天均客户端渲染）。若以后需要 SSR 私有页面，改成 Next.js Route Handler 做 BFF 代理，浏览器只持 cookie。
- WebSocket 握手从 `handshake.auth.token` 取 access token，`WsGuard` 校验后才允许 `join` 房间。

### 6.5 实时聊天

| 项 | 设计 |
| --- | --- |
| 命名空间 | `/ws` |
| 房间 | `post:{postId}` |
| 入房校验 | access token 有效 + 是该局 host 或 `PostMember`，否则 `disconnect` |
| 上行事件 | `message:send { postId, content, clientMsgId }`，服务端 ack 返回持久化后的消息或错误码 |
| 下行事件 | `message:new`、`post:full`、`post:cancelled`、`member:joined` |
| 持久化 | 先写库再广播（保证顺序与可回溯） |
| 历史消息 | 走 REST `GET /api/v1/posts/:id/messages?cursor=`，WebSocket 只负责增量 |
| 多实例 | `@socket.io/redis-adapter`，在线状态用 Redis `SETEX` 存 `online:{postId}:{userId}` |
| 断线补偿 | 重连后客户端请求 `after=lastMessageId` 补齐 |

实现细节（M4 已落地）：

- 事件名集中在 `packages/shared/src/schemas/message.ts` 的 `WS_EVENTS`，前后端不复写字符串；上行消息体用 `sendMessagePayloadSchema` 校验，服务端再校验一次。
- 入房用 `post:join { postId }`，ack 失败返回 `{ ok: false, code, message }`（`NOT_POST_MEMBER` 等），随后由服务端断开连接；发消息前必须已在该房间，否则 ack 返回 `FORBIDDEN`。
- `message:send` 的 ack 成功返回 `{ ok: true, message }`；限流为单用户 10 秒 10 条（Redis `ws:msg:{userId}`），超限返回 `RATE_LIMITED`。
- 连接在 `handleConnection` 阶段校验 `handshake.auth.token`，失败先发 `auth:error` 再断开；access token 过期后由客户端刷新页面重连。
- 审批通过、成团满员、发起人取消都会写入 `type=SYSTEM` 的消息（`xxx 加入了局`、`人数已满，成团啦`、`发起人取消了这个局`），并在事务提交后广播 `message:new` 与 `member:joined` / `post:full` / `post:cancelled`。
- `GET /posts/:id/messages` 默认按 `createdAt DESC, id DESC` 返回，向上翻页用 `cursor`；传 `after` 时改为升序返回该消息之后的增量，供重连补齐。
- `CANCELLED` / `CLOSED` 的局历史可读但发消息返回 `POST_NOT_OPEN`（409）。

不做消息已读回执与输入中提示（P2）。消息长度与频率由服务端再次校验，不能只信前端。

### 6.6 搜索与筛选

V1 的所有筛选都是等值或范围条件，走索引即可，不引入搜索引擎：

| 筛选 | 实现 |
| --- | --- |
| 游戏 / 平台 | `Post.gameId` + `GameInfo.platform` 索引 |
| 时间范围 | `(domain, status, startTime)` 复合索引 |
| 标题关键词 | `pg_trgm` GIN 索引：`CREATE EXTENSION pg_trgm; CREATE INDEX post_title_trgm ON "Post" USING GIN (title gin_trgm_ops);`，查询 `title ILIKE '%词%'` |
| 段位 | 文本匹配（V1 不做区间比较，见 PRD §8） |
| 演唱会艺人 / 巡演名 | `ConcertInfo.artist` 普通索引 + `pg_trgm` GIN；巡演名一起走模糊匹配 |
| 演唱会座位区域 | `ConcertInfo.seatType` 等值筛选，走 `Post(domain,status,startTime)` 后按主键回表 |
| 旅游目的地 | `TravelInfo.destination` `pg_trgm` GIN |
| 旅游预算上限 | `TravelInfo.budgetMax` 索引；未填上限的局按「不设限」参与筛选 |
| 旅游交通方式 | `TravelInfo.transport` 等值筛选 |

数据量超过约 10 万条局或需要相关性排序时，再上 Meilisearch：以 outbox 表做增量同步，不改变对外 API 契约。

徒步路线攻略是静态内容（`packages/shared/src/hiking-routes.ts`），不参与局的筛选，也不新增数据库索引与接口。

### 6.7 图片上传

- 客户端向 `POST /api/v1/uploads/presign` 申请预签名 PUT（返回 `key` 与 `url`），直传 S3/MinIO，服务端只做签发与校验。
- 服务端限制：`contentType ∈ {image/jpeg,image/png,image/webp}`，`contentLength ≤ 5MB`，key 前缀按用户/用途隔离（`posts/{postId}/{uuid}.webp`）。
- 数据库只存 `key`，不存完整 URL；读取时由 CDN 域名拼接，方便换存储。
- V1 不做图片压缩与水印（P2）。

### 6.8 定时任务

| 任务 | 频率 | 动作 |
| --- | --- | --- |
| 结束过期局 | 每 10 分钟 | `status IN (OPEN, FULL) AND startTime + 6h < now()` → `CLOSED` |
| 开始前提醒 | 每小时 | 开始前 24h 且未提醒过 → 站内通知 |
| 清理过期令牌 | 每天 | 删除 `expiresAt < now() - 7d` 的 refresh token |

多实例部署时用 Redis 分布式锁（`SET key val NX PX`）保证同一任务只跑一次，或把 job 拆到独立进程。

实现（`PostLifecycleService`）：进程内每 10 分钟触发一次，锁键 `job:close-expired-posts`、TTL 9 分钟；Redis 不可用时降级为直接执行（宁可重复执行 `updateMany`，也不要让局停在 `OPEN`）。`NODE_ENV=test` 时不注册定时器，由用例显式调用 `closeExpiredPosts()`。

### 6.9 评价与举报

- **评价资格**：局为 `CLOSED`，或 `startTime + 6h <= now()`（不依赖定时任务的执行时机）；调用者与被评价者都必须是 `PostMember`，不能评价自己。唯一约束 `(postId, fromId, toId)` 兜底重复评价。
- **信誉分**：`SELECT ... FOR UPDATE` 锁定被评价用户行，再用纯函数 `nextTrustScore` 计算（公式见 `PRD.md` §8.4），与评价写入、通知写入同一事务。举报成立扣 10 分同样走行锁 + `penalizeTrustScore`。
- **举报去重**：`(reporterId, targetType, targetId, createdAt)` 索引上查 24 小时内最近一条，命中返回 409 `REPORT_DUPLICATE` 并带 `retryAt`。
- **管理员处理**：`report.updateMany({ where: { id, status: { in: [PENDING, REVIEWING] } } })` 做条件更新，只有第一次处理生效；下架局只影响 `OPEN/FULL`，封禁只影响 `ACTIVE` 并吊销刷新令牌。处理结果通过 `REPORT_RESULT` 通知举报人，被举报人看不到举报人身份。
- 动作与对象类型的对应关系：`POST` 支持 `REMOVE_POST`/`BAN_USER`/`REJECT`，`USER` 支持 `BAN_USER`/`REJECT`，`MESSAGE` 只支持 `REJECT`。

## 7. API 契约

统一前缀 `/api/v1`，全部 JSON，时间用 ISO 8601（UTC，带 `Z`）。

### 7.1 端点

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 否 | 邮箱注册，返回 tokens |
| POST | `/auth/login` | 否 | 登录，返回 access + 设置 refresh cookie |
| POST | `/auth/refresh` | Cookie | 轮换刷新令牌 |
| POST | `/auth/logout` | 是 | 吊销当前 family |
| GET | `/me` | 是 | 当前用户资料 |
| PATCH | `/me` | 是 | 改昵称/头像/城市/简介 |
| GET | `/me/games` | 是 | 我的游戏档案 |
| POST | `/me/games` | 是 | 新增档案（upsert 语义） |
| DELETE | `/me/games/:id` | 是 | 删除档案 |
| GET | `/games` | 否 | 游戏字典（缓存 1 小时） |
| GET | `/posts` | 否 | 列表+筛选+游标分页（`domain=GAME/CONCERT/TRAVEL`） |
| GET | `/me/posts` | 是 | 我发起的局（含全部状态，按创建时间倒序；每项带 `pendingApplicationCount`） |
| GET | `/me/applications` | 是 | 我参与的局（仅 `APPROVED`，按报名时间倒序；每项带 `applicationId`/`appliedAt`） |
| POST | `/posts` | 是 | 发局（按 `domain` 分支，事务内写 `Post` + `GameInfo` / `ConcertInfo` / `TravelInfo`） |
| GET | `/posts/:id` | 否 | 详情（含成员、我的报名状态） |
| PATCH | `/posts/:id` | 是（作者） | 修改标题/描述/时间等 |
| DELETE | `/posts/:id` | 是（作者） | 取消局（软取消，status=CANCELLED） |
| GET | `/posts/:id/applications` | 是（作者） | 报名列表 |
| POST | `/posts/:id/applications` | 是 | 报名 |
| PATCH | `/applications/:id` | 是（作者） | 通过/拒绝 |
| DELETE | `/applications/:id` | 是（本人） | 撤回（仅 PENDING） |
| GET | `/posts/:id/members` | 是（成员或作者） | 成员列表 |
| GET | `/posts/:id/messages` | 是（成员或作者） | 历史消息（游标；`after=<id>` 用于重连补齐） |
| GET | `/posts/:id/reviews` | 否 | 局内评价列表（按时间正序游标） |
| POST | `/posts/:id/reviews` | 是（成员，局结束后） | 提交评价（1–5 星），同时更新对方信誉分 |
| GET | `/users/:id` | 否 | 公开主页（昵称、信誉分、评价数） |
| GET | `/users/:id/reviews` | 否 | 收到的评价（按时间倒序游标） |
| POST | `/reports` | 是 | 举报（局 / 用户 / 消息，同目标 24h 一次） |
| GET | `/notifications` | 是 | 通知列表（未读优先） |
| POST | `/notifications/read` | 是 | 批量已读 |
| POST | `/uploads/presign` | 是 | 申请上传签名 |
| GET | `/admin/reports` | 是（ADMIN） | 举报队列，默认按提交时间正序（先到先处理） |
| PATCH | `/admin/reports/:id` | 是（ADMIN） | 处理举报：`REMOVE_POST` / `BAN_USER` / `REJECT` |
| GET | `/health` | 否 | 存活与就绪检查 |

### 7.2 列表请求与响应

```
GET /api/v1/posts?domain=GAME&gameId=xxx&platform=PC&city=成都
    &startFrom=2026-10-21T00:00:00Z&startTo=2026-10-31T23:59:59Z
    &q=排位&limit=20&cursor=eyJ0IjoiMjAyNi0xMC0yMVQxMjowMDowMFoiLCJpZCI6ImN4In0
```

```json
{
  "items": [
    {
      "id": "clx...",
      "title": "今晚八点无畏契约排位缺一",
      "domain": "GAME",
      "game": { "id": "clg...", "name": "无畏契约", "coverUrl": "https://cdn/..." },
      "platform": "PC",
      "mode": "竞技",
      "rankMin": "钻石",
      "rankMax": "不朽",
      "startTime": "2026-10-20T12:00:00.000Z",
      "capacity": 5,
      "memberCount": 4,
      "status": "OPEN",
      "author": { "id": "clu...", "nickname": "阿澈", "avatarUrl": null, "trustScore": 72 }
    }
  ],
  "nextCursor": "eyJ0IjoiMjAyNi0xMC0yMFQxMjowMDowMFoiLCJpZCI6ImNseCJ9",
  "hasMore": true
}
```

演唱会与旅游共用同一套游标分页，只是筛选参数不同：

```
GET /api/v1/posts?domain=CONCERT&artist=陈粒&seatType=INNER&city=上海&limit=20
GET /api/v1/posts?domain=TRAVEL&destination=大理&budgetMax=4000&transport=TRAIN&limit=20
```

响应在游戏字段之外，按领域带 `concert` 或 `travel` 对象；非对应领域时为 `null`：

```json
{
  "id": "clx...",
  "title": "陈粒上海站内场找同行",
  "domain": "CONCERT",
  "game": null,
  "concert": {
    "artist": "陈粒",
    "tourName": "洄游",
    "venue": "梅赛德斯-奔驰文化中心",
    "seatType": "INNER",
    "hasTicket": true,
    "ticketNote": "内场 B 区"
  },
  "travel": null,
  "startTime": "2026-10-24T11:00:00.000Z",
  "endTime": null
}
```

旅游局把 `startTime` / `endTime` 当作出发与返程日期，`travel.budgetMin` / `budgetMax` 为整数元；`budgetMax` 筛选会把「未填上限」视为不设限。

### 7.3 错误契约

```json
{ "code": "POST_FULL", "message": "该局已满员", "details": { "postId": "clx..." } }
```

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | zod 校验失败，`details` 为字段错误 |
| 401 | `UNAUTHORIZED` / `TOKEN_EXPIRED` | 未登录或 access 过期（前端据此刷新） |
| 403 | `FORBIDDEN` / `NOT_POST_MEMBER` | 无权限（非作者、非成员） |
| 404 | `NOT_FOUND` | 资源不存在或已删除 |
| 409 | `POST_FULL` / `ALREADY_APPLIED` / `ALREADY_DECIDED` / `POST_NOT_OPEN` / `POST_NOT_ENDED` / `ALREADY_REVIEWED` / `REPORT_DUPLICATE` | 状态冲突 |
| 429 | `RATE_LIMITED` | 触发限流，`details.retryAfter` |
| 500 | `INTERNAL_ERROR` | 兜底，日志里带 `requestId`，不返回堆栈 |

业务错误统一抛 `AppException(code, httpStatus, message)`，由全局过滤器序列化，禁止在 controller 里手写 `res.status()`。

## 8. 安全与限流

| 措施 | 位置 | 说明 |
| --- | --- | --- |
| 所有权校验 | service 层 | 改/删局校验 `authorId`；审批校验 host；聊天校验成员 |
| 密码 | auth | bcrypt（cost 12）或 argon2id |
| 令牌 | auth | refresh 只存哈希；复用即吊销全家族 |
| 限流 | 守卫 + Redis | 登录 5/min/IP；发局 10/天/用户；报名 30/天/用户；举报 1/24h/目标 |
| 输入校验 | 全局管道 | zod schema 来自 `packages/shared`，未知字段拒绝（`strict`） |
| 上传 | uploads | MIME + 大小 + key 前缀隔离，禁止用户指定任意 key |
| SQL | repository | 只用 Prisma 参数化查询；原生 SQL 必须用模板字面量插值（自动参数化），禁止字符串拼接 |
| 日志脱敏 | 拦截器 | 过滤 `password`、`token`、`phone`、`authorization` 字段 |
| CORS | main.ts | 白名单只允许 `WEB_ORIGIN`，带 credentials |
| 管理员 | admin | V1 用 `ADMIN_EMAILS` 环境变量比对，不新建角色表 |

## 9. 可观测性

- **日志**：pino，结构化 JSON；每条请求带 `requestId`（`x-request-id` 透传）；错误自动带上下文。
- **健康检查**：`/health` 返回 `{ status, db, redis }`；`/health/live` 只查进程。
- **异常**：Sentry 接入 API 与 Web，`release` 用 git sha。
- **指标**：V1 只记录关键计数（发局数、报名数、成团数、WS 连接数），写入 Redis 或日志，不搭 Prometheus。
- **审计**：举报处理、封禁等管理动作写日志表（P1 建 `AuditLog`）。

## 10. 测试策略

| 层 | 工具 | 范围 | 要求 |
| --- | --- | --- | --- |
| 单元 | Vitest | 纯函数：信誉分计算、游标编解码、状态机判定 | 覆盖率 ≥ 80% 于 `common/` 与 `*.rules.ts` |
| 集成 | Vitest + Supertest + 真实 Postgres | 每个 endpoint 一条 happy path + 至少两条错误路径 | 新增接口必须有 |
| 并发 | Vitest + `Promise.all` | 用 10 个并发请求抢 3 个名额 | 名额不超卖，成功数恰为 3 |
| E2E | Playwright | 注册 → 建档案 → 发局 → 第二账号报名 → 审批 → 聊天 → 评价 | 主闭环必须绿 |

集成测试用独立数据库（`allisteam_test`），每个文件前 `prisma migrate deploy` + `TRUNCATE ... RESTART IDENTITY CASCADE`。因为本机没有 Docker，测试连同一个 Postgres 实例的不同 database；CI 里用 GitHub Actions 的 service container。

Playwright 用两个 browser context 模拟发起人与报名者，验证 WS 消息实时到达。

## 11. CI/CD 与部署

**CI（GitHub Actions）**

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16, env: { POSTGRES_PASSWORD: test, POSTGRES_DB: allisteam_test }, ports: ['5432:5432'] }
      redis:    { image: redis:7, ports: ['6379:6379'] }
    steps:
      - checkout
      - npm ci
      - npm run -w packages/shared build
      - npm run -w apps/api prisma:deploy
      - npm run lint && npm run typecheck
      - npm run -w apps/api test
      - npm run -w apps/web build
      - npm run e2e          # Playwright，失败上传 trace
```

**部署（V1 单环境）**

| 组件 | 方案 |
| --- | --- |
| web | Vercel（环境变量 `NEXT_PUBLIC_API_URL`） |
| api | Fly.io / Render 的容器（仓库内 `Dockerfile`，`prisma migrate deploy` 作为 release 步骤） |
| postgres | Neon / Supabase（开启每日备份） |
| redis | Upstash |
| 存储 | Cloudflare R2 + 自定义 CDN 域名 |

**环境变量清单**

```
# API
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_ACCESS_TTL=30m
REFRESH_TTL_DAYS=14
WEB_ORIGIN=http://localhost:3000
S3_ENDPOINT / S3_REGION / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_PUBLIC_BASE_URL
ADMIN_EMAILS=you@example.com
# Web
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

密钥只放在 `.env.local`（git 忽略）与平台 Secret 中。

## 12. 多领域落地记录（V1.5 已完成）

1. `ConcertInfo` / `TravelInfo` 模型与迁移已落地（`20261020164310_multi_domain_concert_travel`、`20261020165000_travel_budget_check`）；`Post` 主表只增加关系，不改业务字段。
2. `packages/shared`：`createPostSchema` 用 discriminated union 分三支，列表筛选参数增加 `domain`、`artist`、`seatType`、`destination`、`budgetMax`、`transport`。
3. `PostsService.create` / `list` 增加领域分支；列表按 `domain` 过滤，领域条件通过扩展表 relation 过滤，不改变游标契约。
4. 索引：`Post(domain,status,startTime)`、`ConcertInfo.artist`（普通 + `pg_trgm` GIN）、`TravelInfo.destination`（`pg_trgm` GIN）、`TravelInfo.budgetMax`。
5. 前端发布表单、首页筛选、卡片与详情页复用同一套票券组件，按领域切换字段与配色。
6. 集成测试：`apps/api/test/multi-domain.e2e-spec.ts` 覆盖演唱会 / 旅游发布、筛选与非法输入。
7. 迁移顺序修正：早期提交的 `20261020130931_m5_trust_indexes` 时间戳早于 `init`，会把索引建在空库上失败；已重命名为 `20261020170000_m5_trust_indexes`。已有开发 / 测试库需执行一次迁移历史修复（删除旧记录与旧索引后 `prisma migrate deploy`），新库无需处理。
8. 徒步路线攻略（旅行模块的附加内容）：数据放在 `packages/shared/src/hiking-routes.ts`，不建表、不加接口、不引入地图 SDK。前端新增 `/travel/hikes` 列表（难度 / 地区用 URL 参数筛选）与 `/travel/hikes/[slug]` 详情（`generateStaticParams` 预渲染），旅行首页增加三条精选入口；发布表单按目的地模糊匹配攻略并支持从详情页预填目的地。小地图与海拔剖面都是内联 SVG 示意，明确标注「非导航」，符合 `PRD.md` §5.2 的非目标。

## 13. 风险与备选方案

| 风险 | 触发点 | 应对 |
| --- | --- | --- |
| 本机缺少 Docker 导致起步受阻 | M0 | 走路线 B（Neon + Upstash），代码无需改动 |
| Prisma 事务隔离级别默认 Read Committed 不足以覆盖复杂判定 | 后续加「退出名额」 | 该操作同样用条件更新；必要时 `SELECT ... FOR UPDATE` 或 `Serializable` |
| Socket.IO 水平扩容后房间消息丢失 | 多实例上线 | 必须启用 Redis adapter，压测 2 实例的房间广播 |
| `pg_trgm` 中文分词效果一般 | 搜索体验差 | 中文场景改用 Meilisearch，接口契约不变 |
| 定时任务在多实例重复执行 | 多实例上线 | Redis 分布式锁，或拆出独立 worker |
| 前端内存态 access token 在刷新页面后丢失 | 每次刷新多一次 refresh 请求 | 可接受；若体验不佳，改 BFF cookie 方案 |
| 时间显示错乱 | 用户跨时区 | 后端一律 UTC `timestamptz`，前端按浏览器时区格式化，测试覆盖跨时区用例 |
