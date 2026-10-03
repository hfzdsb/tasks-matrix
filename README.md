# tasks-matrix

四象限任务管理应用，支持 GitHub Pages、账号登录、跨设备同步，以及可扩展的插件架构。

## 核心功能

- 四象限任务拖拽
- 本机自动保存
- 邮箱 + 密码注册 / 登录 / 退出
- 修改密码
- 同一账号跨设备同步
- 任务位置使用归一化坐标，在不同屏幕尺寸上保持相近布局
- GitHub Pages 静态部署，无需自己维护服务器
- 插件运行时：额外功能可独立放在 `plugins/` 目录，不必再把全部逻辑塞进 `index.html`

> 当前第一阶段只完成插件基础架构。现有记账功能暂时仍保留在主页面，插件商店 UI 和功能迁移将在后续阶段进行。

## 插件架构

目录结构：

```text
/
├─ index.html
├─ plugin-runtime.js
└─ plugins/
   ├─ manifest.json
   ├─ _template.js
   └─ README.md
```

- `plugin-runtime.js`：负责插件发现、按需加载、安装/卸载、挂载/清理以及插件数据保存。
- `plugins/manifest.json`：插件清单。新增正式插件时在这里登记。
- `plugins/_template.js`：插件开发模板。
- `plugins/README.md`：插件 API 与开发约定。

插件安装列表和插件自己的状态会存入本机，并在用户登录后随 `app_state` 一起同步到 Supabase。

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

> 只能填写 public publishable/anon key。不要把 `service_role` 或 secret key 放进网页或 GitHub 仓库。

## 同步方式

登录后，网页会把当前任务、现有记账数据以及插件安装/状态数据保存到 Supabase 的 `app_state` 表。每个账号只能通过 RLS 访问自己的那一行数据。

如果 Supabase 尚未配置或网络不可用，仍可使用本机模式；数据会保存在浏览器 localStorage 中。
