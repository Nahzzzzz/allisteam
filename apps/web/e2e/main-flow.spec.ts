import { expect, test } from '@playwright/test';

function localDateTimeInput(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 3_600_000);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test('主闭环：注册 → 游戏档案 → 发局 → 首页搜到 → 详情可见', async ({ page }) => {
  const unique = Date.now();
  const email = `e2e${unique}@test.local`;
  const title = `E2E 排位缺人 ${unique}`;

  await page.goto('/register');
  await page.getByLabel('昵称').fill('E2E 玩家');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('abc12345');
  await page.getByRole('button', { name: '注册' }).click();

  await expect(page).toHaveURL(/\/me/);
  await expect(page.getByRole('heading', { name: '游戏档案' })).toBeVisible();

  // 添加一条游戏档案（选择种子数据里的第一款游戏）
  await page.getByLabel('游戏').selectOption({ index: 1 });
  await page.getByRole('button', { name: '添加' }).click();
  await expect(page.getByText('游戏档案已添加')).toBeVisible();

  await page.goto('/posts/new');
  await page.getByLabel('标题').fill(title);
  await page.getByLabel('描述').fill('E2E 自动化创建的局，能开麦，打两小时。');
  await page.getByLabel('游戏').selectOption({ index: 1 });
  await page.getByLabel('开始时间').fill(localDateTimeInput(6));
  await page.getByRole('button', { name: '发布' }).click();

  await expect(page).toHaveURL(/\/posts\/[^/]+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('还差 4 人')).toBeVisible();

  await page.goto('/');
  await page.getByPlaceholder(/搜索局/).fill(title);
  await page.getByRole('button', { name: '筛选' }).click();

  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
});

test('未登录访问我的页面会提示登录', async ({ page }) => {
  await page.goto('/me');
  await expect(page.getByText('请先登录')).toBeVisible();
});

test('主闭环续：报名 → 发起人审批 → 成团满员', async ({ page, browser }) => {
  const unique = Date.now();
  const title = `E2E 审批链路 ${unique}`;

  // 发起人：注册并发布一个 2 人局
  await page.goto('/register');
  await page.getByLabel('昵称').fill(`发起人${unique % 100000}`);
  await page.getByLabel('邮箱').fill(`e2e-host${unique}@test.local`);
  await page.getByLabel('密码').fill('abc12345');
  await page.getByRole('button', { name: '注册' }).click();
  await expect(page).toHaveURL(/\/me/);

  await page.goto('/posts/new');
  await page.getByLabel('标题').fill(title);
  await page.getByLabel('描述').fill('E2E 审批链路，两人局，报名后立即满员。');
  await page.getByLabel('游戏').selectOption({ index: 1 });
  await page.getByLabel('开始时间').fill(localDateTimeInput(6));
  await page.getByLabel('名额').fill('2');
  await page.getByRole('button', { name: '发布' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // 注意排除 /posts/new 本身，避免还没跳转就把 /posts/new 当成局详情
  await page.waitForURL(/\/posts\/(?!new$)[^/]+$/);
  const postUrl = new URL(page.url()).pathname;

  // 申请人：独立的浏览器上下文，避免和发起人共用登录态
  const guestNickname = `申请人${unique % 100000}`;
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto('/register');
  await guestPage.getByLabel('昵称').fill(guestNickname);
  await guestPage.getByLabel('邮箱').fill(`e2e-guest${unique}@test.local`);
  await guestPage.getByLabel('密码').fill('abc12345');
  await guestPage.getByRole('button', { name: '注册' }).click();
  await expect(guestPage).toHaveURL(/\/me/);

  await guestPage.goto(postUrl);
  await guestPage.getByPlaceholder(/晚上八点能到/).fill('我能到，可以开麦。');
  await guestPage.getByRole('button', { name: '提交报名' }).click();
  await expect(guestPage.getByText('报名已提交，等待发起人审批')).toBeVisible();

  // 发起人在「我发起的」看到待处理报名数
  await page.goto('/me/posts');
  await expect(page.getByText('待处理 1 条报名')).toBeVisible();
  await page.goto(postUrl);
  await expect(page.getByRole('heading', { name: '待处理报名' })).toBeVisible();
  await page.getByRole('button', { name: '通过' }).click();
  await expect(page.getByText('名额已满，新的申请暂时无法通过。')).toBeVisible();

  // 申请人刷新后看到自己已经在局里
  await guestPage.reload();
  await expect(guestPage.getByText('你已经在成员列表里了')).toBeVisible();

  // 「我参与的」能看到刚加入的局
  await guestPage.goto('/me/applications');
  await expect(guestPage.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await expect(guestPage.getByRole('link', { name: '局内聊天' })).toBeVisible();

  // 局内聊天：申请人先进房发言，发起人进来能看到历史与系统消息
  await guestPage.goto(`${postUrl}/chat`);
  await expect(guestPage.getByRole('heading', { name: title })).toBeVisible();
  await guestPage.getByPlaceholder('说点什么…').fill('我到了，开麦没问题。');
  await guestPage.getByRole('button', { name: '发送' }).click();
  await expect(guestPage.getByText('我到了，开麦没问题。')).toBeVisible();

  await page.goto(`${postUrl}/chat`);
  await expect(page.getByText('我到了，开麦没问题。')).toBeVisible();
  await expect(page.getByText(`${guestNickname} 加入了局`)).toBeVisible();

  // 实时：申请人再发一条，发起人不刷新也能收到
  await guestPage.getByPlaceholder('说点什么…').fill('房间号 1234');
  await guestPage.getByRole('button', { name: '发送' }).click();
  await expect(page.getByText('房间号 1234')).toBeVisible();

  await guestContext.close();
});
