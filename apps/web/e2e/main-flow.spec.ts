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
