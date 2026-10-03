(() => {
  "use strict";

  let toast = () => {};
  let overlay = null;
  let grid = null;
  let dock = null;
  const launchers = new Map();

  function injectStyles() {
    if (document.getElementById("tm-plugin-store-style")) return;
    const style = document.createElement("style");
    style.id = "tm-plugin-store-style";
    style.textContent = `
      .tm-store-btn{position:fixed;right:22px;bottom:136px;z-index:12;width:58px;height:58px;border:1px solid rgba(255,255,255,.18);border-radius:50%;cursor:pointer;color:#fff;font-size:24px;background:linear-gradient(135deg,#0f766e,#2563eb);box-shadow:0 8px 22px rgba(37,99,235,.4);transition:transform .15s,filter .15s}
      .tm-store-btn:hover{transform:scale(1.08);filter:brightness(1.08)}
      .tm-plugin-dock{position:fixed;right:18px;bottom:210px;z-index:11;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}
      .tm-plugin-launcher{pointer-events:auto;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 11px;background:rgba(15,23,42,.88);color:#fff;cursor:pointer;font:12px "Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28)}
      .tm-plugin-launcher:hover{border-color:#818cf8}
      .tm-store-overlay{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.76);backdrop-filter:blur(5px);user-select:text}
      .tm-store-overlay.open{display:flex}
      .tm-store-panel{width:min(920px,96vw);max-height:88vh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#0f172a;box-shadow:0 28px 80px rgba(0,0,0,.58)}
      .tm-store-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 22px 15px;background:rgba(15,23,42,.96);border-bottom:1px solid rgba(255,255,255,.08)}
      .tm-store-head h2{margin:0;color:#fff;font-size:21px}.tm-store-head p{margin:5px 0 0;color:#94a3b8;font-size:12px;line-height:1.5}
      .tm-store-close{border:0;background:transparent;color:#94a3b8;font-size:25px;cursor:pointer;line-height:1}
      .tm-store-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:13px;padding:18px}
      .tm-plugin-card{display:flex;flex-direction:column;min-height:190px;padding:17px;border:1px solid rgba(255,255,255,.1);border-radius:17px;background:rgba(30,41,59,.58)}
      .tm-plugin-card.installed{border-color:rgba(74,222,128,.35);background:rgba(20,83,45,.14)}
      .tm-plugin-title{display:flex;align-items:center;gap:10px;color:#fff;font-weight:700;font-size:16px}.tm-plugin-icon{font-size:27px}
      .tm-plugin-desc{color:#cbd5e1;font-size:13px;line-height:1.6;margin-top:10px;flex:1}
      .tm-plugin-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.tm-plugin-tag{font-size:10px;color:#94a3b8;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:3px 7px}
      .tm-plugin-actions{display:flex;gap:8px;margin-top:14px}.tm-plugin-actions button{flex:1;border:0;border-radius:10px;padding:9px 10px;color:#fff;cursor:pointer;font-family:inherit}
      .tm-install{background:linear-gradient(135deg,#4f46e5,#7c3aed)}.tm-open{background:#047857}.tm-uninstall{background:#334155}
      .tm-store-empty{color:#94a3b8;padding:28px;text-align:center}
      @media (max-width:560px){.tm-store-grid{grid-template-columns:1fr;padding:12px}.tm-store-head{padding:16px}.tm-plugin-dock{right:12px}.tm-store-btn{right:18px}}
    `;
    document.head.appendChild(style);
  }

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  async function render() {
    if (!grid || !window.TaskMatrixPlugins) return;
    const items = window.TaskMatrixPlugins.list();
    grid.textContent = "";
    if (!items.length) {
      grid.appendChild(make("div", "tm-store-empty", "暂时还没有可安装插件。"));
      return;
    }

    for (const item of items) {
      const card = make("article", "tm-plugin-card" + (item.installed ? " installed" : ""));
      const title = make("div", "tm-plugin-title");
      title.appendChild(make("span", "tm-plugin-icon", item.icon || "🧩"));
      title.appendChild(make("span", "", item.name));
      card.appendChild(title);
      card.appendChild(make("div", "tm-plugin-desc", item.description || "暂无说明"));

      const meta = make("div", "tm-plugin-meta");
      if (item.category) meta.appendChild(make("span", "tm-plugin-tag", item.category));
      if (item.version) meta.appendChild(make("span", "tm-plugin-tag", "v" + item.version));
      meta.appendChild(make("span", "tm-plugin-tag", item.installed ? "已安装" : "未安装"));
      card.appendChild(meta);

      const actions = make("div", "tm-plugin-actions");
      if (!item.installed) {
        const install = make("button", "tm-install", "安装");
        install.addEventListener("click", async () => {
          install.disabled = true;
          try {
            await window.TaskMatrixPlugins.install(item.id);
            toast("已安装：" + item.name);
            await render();
          } catch (err) {
            toast("安装失败：" + (err?.message || err));
          } finally {
            install.disabled = false;
          }
        });
        actions.appendChild(install);
      } else {
        const open = make("button", "tm-open", "打开");
        open.addEventListener("click", async () => {
          try {
            await window.TaskMatrixPlugins.open(item.id);
            close();
          } catch (err) {
            toast("打开失败：" + (err?.message || err));
          }
        });
        const uninstall = make("button", "tm-uninstall", "卸载");
        uninstall.addEventListener("click", async () => {
          if (!confirm("卸载“" + item.name + "”？插件数据会保留，重新安装后可继续使用。")) return;
          uninstall.disabled = true;
          try {
            await window.TaskMatrixPlugins.uninstall(item.id);
            toast("已卸载：" + item.name);
            await render();
          } catch (err) {
            toast("卸载失败：" + (err?.message || err));
          } finally {
            uninstall.disabled = false;
          }
        });
        actions.append(open, uninstall);
      }
      card.appendChild(actions);
      grid.appendChild(card);
    }
  }

  function open() {
    if (!overlay) return;
    render();
    overlay.classList.add("open");
  }

  function close() {
    overlay?.classList.remove("open");
  }

  function addLauncher(id, item = {}) {
    if (!dock || launchers.has(id)) return launchers.get(id);
    const btn = make("button", "tm-plugin-launcher");
    btn.type = "button";
    btn.title = item.title || item.label || id;
    btn.appendChild(make("span", "", item.icon || "🧩"));
    btn.appendChild(make("span", "", item.label || id));
    btn.addEventListener("click", () => {
      if (typeof item.onClick === "function") item.onClick();
      else window.TaskMatrixPlugins?.open?.(id);
    });
    dock.appendChild(btn);
    launchers.set(id, btn);
    return btn;
  }

  function removeLauncher(id) {
    const btn = launchers.get(id);
    if (btn) btn.remove();
    launchers.delete(id);
  }

  function init(options = {}) {
    if (overlay) return;
    toast = typeof options.toast === "function" ? options.toast : toast;
    injectStyles();

    dock = make("div", "tm-plugin-dock");
    dock.id = "tmPluginDock";
    document.body.appendChild(dock);

    const button = make("button", "tm-store-btn", "🧩");
    button.type = "button";
    button.title = "插件商店";
    button.setAttribute("aria-label", "打开插件商店");
    button.addEventListener("click", open);
    document.body.appendChild(button);

    overlay = make("div", "tm-store-overlay");
    overlay.id = "tmPluginStore";
    const panel = make("section", "tm-store-panel");
    const head = make("header", "tm-store-head");
    const intro = make("div");
    intro.appendChild(make("h2", "", "插件商店"));
    intro.appendChild(make("p", "", "核心只保留四象限。需要什么功能，就安装什么插件。"));
    const x = make("button", "tm-store-close", "×");
    x.type = "button";
    x.addEventListener("click", close);
    head.append(intro, x);
    grid = make("div", "tm-store-grid");
    panel.append(head, grid);
    overlay.appendChild(panel);
    overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    window.addEventListener("taskmatrix:plugins-ready", render);
    window.addEventListener("taskmatrix:plugin-installed", render);
    window.addEventListener("taskmatrix:plugin-uninstalled", render);
  }

  window.TaskMatrixPluginUI = Object.freeze({
    init,
    openStore: open,
    closeStore: close,
    addLauncher,
    removeLauncher,
    refresh: render,
  });
})();