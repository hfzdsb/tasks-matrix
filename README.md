# tasks-matrix

四象限任务管理 + 收支记录，支持 GitHub Pages、账号登录和跨设备同步。

## 功能

- 四象限任务拖拽
- 收支记录
- 本机自动保存
- 邮箱 + 密码注册 / 登录 / 退出
- 同一账号跨设备同步
- 任务位置使用归一化坐标，在不同屏幕尺寸上保持相近布局
- GitHub Pages 静态部署，无需自己维护服务器

## 一次性配置 Supabase

1. 创建一个 Supabase 项目。
2. 在 Supabase 的 **SQL Editor** 中运行仓库里的 `supabase-setup.sql`。
3. 在 **Authentication → Providers** 中确认 Email 登录已启用。
4. 在 **Authentication → URL Configuration** 中，把 Site URL 设置为：
   `https://hfzdsb.github.io/tasks-matrix/`
5. 在 **Project Settings → API** 找到 Project URL 和 public publishable/anon key。
6. 编辑仓库根目录的 `config.js`：

```js
window.TASKS_MATRIX_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_KEY"
};
```

> 只能填写 public publishable/anon key。不要把 `service_role` key 放进网页或 GitHub 仓库。

配置完成后，GitHub Pages 会继续从 `main` 分支部署。

## 同步方式

登录后，网页会把当前任务和收支数据保存到 Supabase 的 `app_state` 表。每个账号只能通过 RLS 访问自己的那一行数据。页面重新打开、切换设备或手动点击同步时，会从云端恢复该账号的数据。

如果 Supabase 尚未配置或网络不可用，仍可使用本机模式；数据会保存在浏览器 localStorage 中。
