# tasks-matrix

四象限任务管理应用，支持 GitHub Pages、账号登录、跨设备同步和可选插件。

## 当前结构

核心页面只负责：

- 四象限任务拖拽
- 任务新增 / 删除 / 重置
- 本机保存
- 账号注册、登录、退出、修改密码
- Supabase 跨设备同步
- 插件运行时与插件商店

额外功能放在 `plugins/` 目录，通过插件商店由用户自行安装。

## 插件商店

主页面右下角的 **🧩** 按钮打开插件商店。

当前插件：

- **收支记账**：原来的固定右侧记账栏已经从核心代码中移除。只有安装插件后才加载记账界面。

卸载插件默认只移除功能，不删除插件数据；以后重新安装仍可继续使用。

旧版本的 `ledgerV1` 本机数据和云端 `state.ledger` 会自动迁移到记账插件的数据空间，但不会强制安装该插件。

## 插件架构

```text
/
├─ index.html
├─ plugin-runtime.js
├─ plugin-store.js
└─ plugins/
   ├─ manifest.json
   ├─ ledger.js
   ├─ _template.js
   └─ README.md
```

新增普通插件通常只需要：

1. 在 `plugins/` 新建插件脚本。
2. 调用 `window.TaskMatrixPlugins.register({...})`。
3. 在 `plugins/manifest.json` 登记名称、入口、版本等信息。

无需再把插件业务逻辑写进 `index.html`。

## Supabase

浏览器端只使用 publishable/anon key。不要把 `service_role` 或 secret key 放进 GitHub Pages。

登录后，核心任务和插件快照统一保存在 `app_state` 中。RLS 继续保证每个普通用户只能访问自己的状态行。
