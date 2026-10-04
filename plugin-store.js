(() => {
  "use strict";

  let toast = () => {};
  let overlay = null, grid = null, dock = null, searchInput = null, categoryBar = null, countEl = null;
  const launchers = new Map();
  let mode = "all";
  let category = "全部";
  let query = "";

  function injectStyles(){ return null; }

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function currentItems() {
    const all = window.TaskMatrixPlugins?.list?.() || [];
    const q = query.trim().toLowerCase();
    return all.filter((item) => {
      if (mode === "installed" && !item.installed) return false;
      if (category !== "全部" && item.category !== category) return false;
      if (q) {
        const hay = [item.name, item.description, item.category, item.id].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderCategories() {
    if (!categoryBar) return;
    const all = window.TaskMatrixPlugins?.list?.() || [];
    const cats = ["全部", ...new Set(all.map(x => x.category).filter(Boolean))];
    if (!cats.includes(category)) category = "全部";
    categoryBar.textContent = "";
    for (const cat of cats) {
      const btn = make("button", "tm-store-cat" + (cat === category ? " on" : ""), cat);
      btn.type = "button";
      btn.addEventListener("click", () => { category = cat; render(); });
      categoryBar.appendChild(btn);
    }
  }

  async function render() {
    if (!grid || !window.TaskMatrixPlugins) return;
    renderCategories();
    const all = window.TaskMatrixPlugins.list();
    const items = currentItems();
    grid.textContent = "";
    if (countEl) countEl.textContent = "显示 " + items.length + " / " + all.length + " 个插件";

    if (!items.length) {
      grid.appendChild(make("div", "tm-store-empty", query ? "没有找到匹配的插件。" : "当前筛选条件下没有插件。"));
      return;
    }

    for (const item of items) {
      const card = make("article", "tm-plugin-card" + (item.installed ? " installed" : ""));
      const title = make("div", "tm-plugin-title");
      title.append(make("span", "tm-plugin-icon", item.icon || "🧩"), make("span", "", item.name));
      card.append(title, make("div", "tm-plugin-desc", item.description || "暂无说明"));

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
          } finally { install.disabled = false; }
        });
        actions.appendChild(install);
      } else {
        const open = make("button", "tm-open", "打开");
        open.addEventListener("click", async () => {
          try { await window.TaskMatrixPlugins.open(item.id); close(); }
          catch (err) { toast("打开失败：" + (err?.message || err)); }
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
          } finally { uninstall.disabled = false; }
        });
        actions.append(open, uninstall);
      }
      card.appendChild(actions);
      grid.appendChild(card);
    }
  }

  function open() { if (!overlay) return; render(); overlay.classList.add("open"); setTimeout(()=>searchInput?.focus(),0); }
  function close() { overlay?.classList.remove("open"); }

  function addLauncher(id, item = {}) {
    if (!dock || launchers.has(id)) return launchers.get(id);
    const btn = make("button", "tm-plugin-launcher");
    btn.type = "button";
    btn.title = item.title || item.label || id;
    btn.append(make("span", "", item.icon || "🧩"), make("span", "", item.label || id));
    btn.addEventListener("click", () => {
      if (typeof item.onClick === "function") item.onClick();
      else window.TaskMatrixPlugins?.open?.(id);
    });
    dock.appendChild(btn); launchers.set(id, btn); return btn;
  }

  function removeLauncher(id) {
    launchers.get(id)?.remove();
    launchers.delete(id);
  }

  function init(options = {}) {
    if (overlay) return;
    toast = typeof options.toast === "function" ? options.toast : toast;
    injectStyles();

    dock = make("div", "tm-plugin-dock"); dock.id = "tmPluginDock"; document.body.appendChild(dock);
    const button = make("button", "tm-store-btn", "🧩");
    button.type = "button"; button.title = "插件商店"; button.setAttribute("aria-label", "打开插件商店");
    button.addEventListener("click", open); document.body.appendChild(button);

    overlay = make("div", "tm-store-overlay"); overlay.id = "tmPluginStore";
    const panel = make("section", "tm-store-panel");
    const head = make("header", "tm-store-head");
    const titleRow = make("div", "tm-store-title-row");
    const intro = make("div");
    intro.append(make("h2", "", "插件商店"), make("p", "", "核心只保留四象限，需要什么功能就安装什么。"));
    const x = make("button", "tm-store-close", "×"); x.type = "button"; x.addEventListener("click", close);
    titleRow.append(intro, x);

    const tools = make("div", "tm-store-tools");
    searchInput = make("input", "tm-store-search");
    searchInput.type = "search"; searchInput.placeholder = "搜索插件、分类或功能…";
    searchInput.addEventListener("input", () => { query = searchInput.value; render(); });
    const tabs = make("div", "tm-store-tabs");
    for (const [value,label] of [["all","全部"],["installed","已安装"]]) {
      const btn = make("button", "tm-store-tab" + (mode===value?" on":""), label);
      btn.type = "button"; btn.dataset.mode = value;
      btn.addEventListener("click", () => {
        mode = value;
        tabs.querySelectorAll(".tm-store-tab").forEach(b=>b.classList.toggle("on",b.dataset.mode===mode));
        render();
      });
      tabs.appendChild(btn);
    }
    tools.append(searchInput, tabs);
    categoryBar = make("div", "tm-store-cats");
    countEl = make("div", "tm-store-count");

    grid = make("div", "tm-store-grid");
    head.append(titleRow, tools, categoryBar, countEl);
    panel.append(head, grid); overlay.appendChild(panel);
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    ["taskmatrix:plugins-ready","taskmatrix:plugin-installed","taskmatrix:plugin-uninstalled"]
      .forEach(name => window.addEventListener(name, render));
  }

  window.TaskMatrixPluginUI = Object.freeze({
    init, openStore: open, closeStore: close, addLauncher, removeLauncher, refresh: render
  });
})();