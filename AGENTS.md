# AGENTS.md

本文件是本仓库的唯一工程约定来源，所有人和 AI 编码代理在改动代码前都要先读。

## 1. 项目是什么

AllieTeam：跨领域「找搭子 / 找队友」平台。用户发布一个**局**（结构化招募帖），别人报名，发起人审批，凑齐人数后成团，在局内聊天，活动结束后互评。

- **V1 只做游戏领域**，但数据模型与代码必须能低成本扩展到演唱会、旅游。
- 业务规则以 `PRD.md` 为准，技术方案以 `Tech Design.md` 为准。两者与代码冲突时，先改文档再改代码，不要悄悄让代码偏离。

改动前需要读的部分：

| 你要做的事 | 必读 |
| --- | --- |
| 改任何业务规则（名额、状态、信誉分、限制） | `PRD.md` §8 |
| 改数据模型、接口、鉴权、部署 | `Tech Design.md` §5–§11 |
| 新增领域（演唱会/旅游） | `Tech Design.md` §12 |

## 2. 环境

已核实：Windows 10、Node.js v24.21.0、npm 11.19.0、git 2.51.2；**pnpm 与 Docker 未安装**，本地也没有 PostgreSQL/Redis。统一使用 **TypeScript 6.0.3**。后端固定 **NestJS 11.2.7**：`@nestjs/*@12` 已改为纯 ESM，与 Prisma 6 / Nest CLI 的 CJS 产物混用会在 `moduleResolution: node16` 下报 `TS1479`，升 12 需整体切 ESM，见 `Tech Design.md` §2。

- 包管理器统一用 **npm**（workspaces），不要引入 pnpm/yarn 的锁文件。
- 本地数据库二选一：装 Docker Desktop 跑 `docker/docker-compose.yml`，或直接用 Neon/Upstash 的连接串写进 `.env.local`。两条路线只差环境变量。
- 脚本必须能在 PowerShell 下跑通（路径加引号，不用 bash 专有语法）。

## 3. 常用命令

```powershell
npm install                                  # 根目录安装所有 workspace 依赖
npm run -w packages/shared build             # shared 必须先构建，api/web 依赖它的产物

npm run -w apps/api prisma:migrate           # 开发迁移（会生成 SQL）
npm run -w apps/api prisma:deploy            # 应用已有迁移（CI/生产）
npm run -w apps/api prisma:seed              # 游戏字典与演示数据
npm run -w apps/api dev                      # API  http://localhost:3001
npm run -w apps/web dev                      # Web  http://localhost:3000

npm run lint
npm run typecheck
npm run -w apps/api test                     # 集成测试（需要可用数据库）
npm run e2e                                  # Playwright
```

端口占用固定为：web 3000、api 3001、postgres 5432、redis 6379、minio 9000/9001。

## 4. 目录与依赖方向

```
packages/shared   ← 被 api 和 web 同时依赖（枚举、zod schema、错误码、DTO 类型）
apps/api          ← NestJS，不依赖 web
apps/web          ← Next.js，不依赖 api 源码，只通过 HTTP/WS 通信
```

- 依赖只能**从左向右**：`web → shared`、`api → shared`。禁止 `api` 引用 `web`，禁止 `shared` 引用任何 app。
- `shared` 只放类型与校验，不放业务实现、不放 Prisma、不放 React。

后端模块内部固定四件套：`controller`（解析参数）、`service`（业务与事务）、`repository`（Prisma 查询）、`dto`（来自 shared 的 zod schema）。

## 5. 编码约定

### 通用

- TypeScript `strict`，禁止 `any`（确实需要时用 `unknown` + 收窄）。禁止 `@ts-ignore`，用 `@ts-expect-error` 并写明原因。
- 所有对外输入（HTTP body/query、WS 消息）必须过 zod 校验，schema 定义在 `packages/shared`，前后端复用同一份。
- 金额、人数、评分一律用整数；时间一律存 UTC，接口返回 ISO 8601 带 `Z`，只在展示层做本地化。
- 新增运行时依赖前先确认标准库/现有依赖能否解决；引入了就写进 `Tech Design.md` §2 的理由列。
- 不要为了「以后可能用到」加抽象。V1 不需要泛型仓储、事件总线、CQRS。

### 后端

- `controller` 不写业务判断，不直接调用 Prisma；不手写 `res.status()`，错误一律抛 `AppException(code, status, message)`。
- 跨模块只调用对方 `service`，禁止跨模块直接用对方的 `PrismaService` 模型。
- 所有写操作在 `service` 内完成**所有权校验**（作者、发起人、成员），不能依赖前端传的 id 自证。
- 事务用 `prisma.$transaction`；事务内不要做网络请求（发通知、上传）——先落库，事务外再触发副作用。
- 状态变更必须用条件更新（`updateMany({ where: { id, status: 'PENDING' } })` 并检查 `count`），不允许「先读状态再写」。
- 名额相关的任何改动必须走 `Tech Design.md` §6.2 的原子 SQL，改完要跑并发测试。

### 前端

- App Router：默认 Server Component；只有需要交互/浏览器 API/登录态数据时加 `'use client'`。
- 服务端数据用 TanStack Query，禁止在组件里裸 `fetch`；所有请求走 `lib/api.ts`（统一加 token、统一处理 `TOKEN_EXPIRED` 自动刷新一次）。
- 表单用 react-hook-form + shared 的 zod schema；前端校验只是体验，后端必须再校验一次。
- 登录态页面（`/me`、聊天）客户端渲染：access token 只在内存，刷新令牌在 httpOnly cookie。
- 样式用 Tailwind + shadcn/ui 组件，移动端 375px 优先；不要在组件里写内联色值。

### 数据库

- 只通过 Prisma 迁移改结构：`prisma migrate dev --name <蛇形描述>`。**已提交的迁移文件不可修改**，改错就再加一个迁移。
- 新增任何筛选条件，必须同时评估并添加索引（参照 `Tech Design.md` §5.2 的索引写法）。
- 需要 CHECK 约束、部分索引、扩展（`pg_trgm`）时，写在迁移文件里手写 SQL，并在文档中说明。
- 原生 SQL 只用 Prisma 模板字面量（`$queryRaw\`... ${param}\``），禁止字符串拼接 SQL。

## 6. 接口契约

- 路径前缀 `/api/v1`，资源用复数，动作用 HTTP 方法表达（不要 `/posts/:id/doApprove`）。
- 列表一律游标分页：请求 `?limit&cursor`，响应 `{ items, nextCursor, hasMore }`。不要加 `page`/`offset`。
- 错误响应固定 `{ code, message, details? }`，`code` 用 `Tech Design.md` §7.3 的枚举；新增 code 要同步进 `shared/errors.ts`。
- 破坏性变更（改字段名、改语义、删接口）必须同步更新 `Tech Design.md` §7 并说明前端的迁移方式。

## 7. 测试要求

- 新增或修改 HTTP 接口：至少 1 条 happy path + 2 条错误路径的集成测试（真实数据库，不用 mock Prisma）。
- 修改名额、报名审批、状态机：必须补/跑并发测试（10 并发抢 3 名额），断言成功数恰好等于剩余名额。
- 修改信誉分、游标编解码、状态判定：补纯函数单测。
- 主闭环相关改动（注册→发局→报名→审批→聊天→评价）：跑一遍 `npm run e2e`。
- 提交前至少 `npm run lint && npm run typecheck && npm run -w apps/api test` 全绿。

## 8. 安全红线

1. 绝不提交密钥、连接串、令牌、私钥；只放 `.env.example` 占位。日志里禁止出现密码、token、手机号明文。
2. 任何按 id 的写操作都要校验「这个用户是否有权改这个资源」，缺一条就是越权漏洞。
3. 上传：不信任客户端给的 MIME 与 key，key 由服务端生成并带前缀隔离。
4. 举报、封禁、管理员操作只允许 `ADMIN_EMAILS` 白名单用户执行。
5. 不实现任何票务交易/转售撮合功能（合规红线，见 `PRD.md` §6）。
6. 不要为了让测试通过而放宽关键约束（CHECK、唯一索引、所有权校验）。

## 9. 提交与分支

- 分支：`feat/<scope>`、`fix/<scope>`、`chore/<scope>`、`docs/<scope>`。
- 提交信息用 Conventional Commits：`feat(posts): 支持按段位筛选`、`fix(applications): 修复并发审批超卖`。
- 一个提交只做一件事；数据库迁移与对应代码放同一个提交，保证任意提交点可迁移。
- PR 描述写清：改了什么、为什么、怎么验证（命令或截图）、是否影响接口契约。

## 10. 已知的坑

| 坑 | 表现 | 处理 |
| --- | --- | --- |
| `shared` 未构建 | api/web 报找不到 `@allisteam/shared` | 先 `npm run -w packages/shared build`，开发时开 watch |
| 原生 SQL 里的枚举 | `status = 'OPEN'` 报类型错误 | 显式写 `'OPEN'::"PostStatus"` |
| 游标分页排序不一致 | 列表出现重复/漏项 | 排序字段必须与游标字段完全一致，并带 `id` 作为次级排序 |
| Prisma 默认 `ReadCommitted` | 复杂判定出现竞态 | 用条件更新；仍不够时 `SELECT ... FOR UPDATE` |
| 时区 | 显示早/晚 8 小时 | 存 UTC，前端格式化；测试用非 UTC 环境跑一次 |
| Socket.IO 多实例 | A 实例发的消息 B 实例的用户收不到 | `@socket.io/redis-adapter`，两实例联调验证 |
| 定时任务重复执行 | 重复发提醒 | Redis `SET NX PX` 锁 |
| Windows 路径 | 脚本在 CI 挂掉 | 脚本里用 `path.join`，不写死反斜杠 |

## 11. 新增一个领域（V1.5）

按顺序做，不要跳步：

1. 读 `Tech Design.md` §12 清单。
2. 新增扩展表模型（如 `ConcertInfo`，主键 `postId`）并生成迁移。
3. `packages/shared` 增加该领域的 payload schema，并加入 discriminated union。
4. `PostsService.create` 增加分支：同一事务内写 `Post` + 扩展表，且保持 `Post` 上的筛选冗余字段一致。
5. 列表与详情接口增加领域字段与筛选参数，补索引。
6. 前端复用现有列表/卡片组件，只新增表单字段与筛选控件。
7. 补集成测试（发局 + 筛选 + 报名）、更新 `PRD.md` §6 与 `Tech Design.md` §5。

## 12. 文档同步

- 改了业务规则 → 更新 `PRD.md` 对应章节，并在提交信息里注明。
- 改了数据模型/接口/鉴权/部署 → 更新 `Tech Design.md`，同时回填实际依赖版本号。
- 本文档只写「怎么做事的规矩」，不写功能细节；功能细节归 PRD，技术细节归 Tech Design。

## 13. 明确不要做

- 不要拆微服务、不要引入消息队列、不要做 CQRS。
- 不要加动态信息流、私信、语音房、支付、推荐算法（都在非目标里）。
- 不要用 JSONB 存领域属性来「省事」。
- 不要用 offset 分页。
- 不要在客户端做权限判断替代服务端校验。
- 不要为通过测试而修改断言或跳过并发测试。
