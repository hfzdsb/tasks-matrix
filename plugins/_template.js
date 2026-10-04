(() => {
  "use strict";

  // 复制本文件并改名，例如 plugins/my-tool.js。
  // 样式放到 styles/plugins/my-tool.css；不要在 JS 中动态创建 <style>。
  // 然后在 plugins/manifest.json 中同时登记 entry 和 style。
  window.TaskMatrixPlugins.register({
    id: "plugin-template",

    async mount(api) {
      // const state = api.storage.get({});
      // api.storage.set({ ...state, example: true });
      // api.host.toast("插件已启动");
      // api.host.addLauncher({
      //   icon: "🧩",
      //   label: "示例",
      //   onClick: () => {}
      // });

      // 如果插件创建了 DOM、定时器或事件监听器，请在返回的清理函数中释放。
      return () => {
        api.host.removeLauncher();
        // cleanup
      };
    },
  });
})();