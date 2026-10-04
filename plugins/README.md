# Tasks Matrix 插件目录

这个目录只放可选功能。四象限任务管理属于核心功能，不放在这里。

## 文件约定

- `manifest.json`：插件商店清单。前端根据这里的条目发现插件。
- `_template.js`：新插件模板，不会自动加载。
- 每个正式插件使用一个独立 JS 文件，样式放在 `styles/plugins/<id>.css`。
- 插件 JS 不要创建 `<style>` 标签，也不要写全局 CSS。

## 添加一个插件

1. 复制 `_template.js`，例如创建 `plugins/pomodoro.js`。
2. 在 `styles/plugins/` 创建对应的 `pomodoro.css`。
3. 使用 `window.TaskMatrixPlugins.register({...})` 注册插件。
4. 在 `manifest.json` 的 `plugins` 数组中登记 JS 和 CSS：

```json
{
  "id": "pomodoro",
  "name": "番茄钟",
  "description": "专注与休息计时器",
  "icon": "🍅",
  "entry": "plugins/pomodoro.js",
  "style": "styles/plugins/pomodoro.css",
  "version": "1.0.0"
}
```

不需要修改 `index.html`。

## 插件 API

`mount(api)` 会收到：

- `api.host.toast(message)`：显示主应用提示。
- `api.host.requestSave()`：请求主应用保存/同步。
- `api.host.getUser()`：获取当前登录用户（可能为 null）。
- `api.host.getTasks()`：获取当前四象限任务快照。
- `api.storage.get(fallback)`：读取当前插件自己的数据。
- `api.storage.set(value)`：保存当前插件自己的数据并触发同步。
- `api.storage.clear()`：清除当前插件数据。

插件卸载时默认只关闭功能，不删除数据；未来插件商店可以提供“卸载并清除数据”。

## 安全边界

插件脚本与主站运行在同一页面，因此仓库中的插件应视为受信任代码。不要支持从任意第三方 URL 动态安装脚本，也不要把 Supabase secret/service-role key 写进插件。


## 插件界面入口

插件可以通过宿主提供的启动器 API 在右侧插件区添加快捷入口：

```js
api.host.addLauncher({
  icon: "🍅",
  label: "番茄钟",
  onClick: () => {
    // 打开插件自己的面板
  }
});
```

插件卸载时调用：

```js
api.host.removeLauncher();
```

如果插件定义了 `open()`，插件商店会提供“打开”按钮：

```js
window.TaskMatrixPlugins.register({
  id: "example",
  mount(api) {
    // mount
    return () => api.host.removeLauncher();
  },
  open() {
    // open panel
  }
});
```

## CSS 隔离规则

- `styles/core.css`：核心布局。
- `styles/plugin-theme.css`：插件通用控件基线。
- `styles/plugin-store.css`：插件商店。
- `styles/ui-2.css` / `styles/ui-2-panels.css`：UI 2.0 视觉覆盖。
- `styles/cursor.css`：唯一允许定义全局鼠标样式的文件。
- `styles/plugins/<id>.css`：单个插件自己的布局和基础样式。

插件运行时会在挂载插件时加载其 `style`，卸载时移除对应 `<link>`，因此插件样式不会永久残留在页面中。
