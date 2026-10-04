(() => {
  "use strict";

  const MANIFEST_URL = "plugins/manifest.json";
  const INSTALLED_KEY = "matrixPluginsInstalledV1";
  const STATE_KEY = "matrixPluginsStateV1";

  const registry = new Map();
  const mounted = new Map();
  const loading = new Map();
  const styleLoading = new Map();
  let manifest = [];
  let hostApi = null;
  let booted = false;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      console.warn("[plugins] localStorage read failed:", err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("[plugins] localStorage write failed:", err);
      return false;
    }
  }

  function getInstalled() {
    const value = readJSON(INSTALLED_KEY, []);
    return Array.isArray(value) ? [...new Set(value.filter((x) => typeof x === "string"))] : [];
  }

  function setInstalled(ids, notify = true) {
    const safe = [...new Set((ids || []).filter((x) => typeof x === "string"))];
    writeJSON(INSTALLED_KEY, safe);
    if (notify) hostApi?.requestSave?.();
    return safe;
  }

  function getAllState() {
    const value = readJSON(STATE_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function getState(id, fallback = null) {
    const all = getAllState();
    return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : fallback;
  }

  function setState(id, value, notify = true) {
    const all = getAllState();
    all[id] = value;
    writeJSON(STATE_KEY, all);
    if (notify) hostApi?.requestSave?.();
    window.dispatchEvent(new CustomEvent("taskmatrix:plugin-state", { detail: { id, value } }));
    return value;
  }

  function clearState(id, notify = true) {
    const all = getAllState();
    delete all[id];
    writeJSON(STATE_KEY, all);
    if (notify) hostApi?.requestSave?.();
  }

  function entryFor(id) {
    return manifest.find((x) => x && x.id === id) || null;
  }

  function versionedAsset(path, version) {
    if (!path) return path;
    const sep = path.includes("?") ? "&" : "?";
    return path + sep + "v=" + encodeURIComponent(version || "1");
  }

  async function loadManifest() {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("插件清单加载失败：HTTP " + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.plugins;
    if (!Array.isArray(items)) throw new Error("插件清单格式错误");
    manifest = items.filter((x) =>
      x && typeof x.id === "string" && typeof x.name === "string" && typeof x.entry === "string"
    );
    return manifest;
  }

  function register(definition) {
    if (!definition || typeof definition.id !== "string") {
      throw new Error("插件注册失败：缺少 id");
    }
    if (typeof definition.mount !== "function") {
      throw new Error("插件 " + definition.id + " 缺少 mount(api) 方法");
    }
    registry.set(definition.id, definition);
    window.dispatchEvent(new CustomEvent("taskmatrix:plugin-registered", {
      detail: { id: definition.id }
    }));
    return definition;
  }

  function pluginApi(id) {
    return Object.freeze({
      id,
      host: Object.freeze({
        toast: (message) => hostApi?.toast?.(String(message)),
        requestSave: () => hostApi?.requestSave?.(),
        getUser: () => hostApi?.getUser?.() || null,
        getTasks: () => hostApi?.getTasks?.() || [],
        addLauncher: (item) => hostApi?.addLauncher?.(id, item),
        removeLauncher: () => hostApi?.removeLauncher?.(id),
      }),
      storage: Object.freeze({
        get: (fallback = null) => getState(id, fallback),
        set: (value) => setState(id, value),
        clear: () => clearState(id),
      }),
    });
  }

  async function ensureStyle(id) {
    const entry = entryFor(id);
    if (!entry?.style) return null;

    const existing = [...document.querySelectorAll("link[data-plugin-style]")]
      .find((el) => el.dataset.pluginStyle === id);
    if (existing) return existing;
    if (styleLoading.has(id)) return styleLoading.get(id);

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = versionedAsset(entry.style, entry.version);
      link.dataset.pluginStyle = id;
      link.onload = () => resolve(link);
      link.onerror = () => {
        link.remove();
        reject(new Error("插件样式加载失败：" + id));
      };
      document.head.appendChild(link);
    }).finally(() => styleLoading.delete(id));

    styleLoading.set(id, promise);
    return promise;
  }

  function removeStyle(id) {
    for (const link of document.querySelectorAll("link[data-plugin-style]")) {
      if (link.dataset.pluginStyle === id) link.remove();
    }
    styleLoading.delete(id);
  }

  async function ensureLoaded(id) {
    if (registry.has(id)) return registry.get(id);
    if (loading.has(id)) return loading.get(id);
    const entry = entryFor(id);
    if (!entry) throw new Error("未找到插件：" + id);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = versionedAsset(entry.entry, entry.version);
      script.async = true;
      script.dataset.pluginId = id;
      script.onload = () => {
        const plugin = registry.get(id);
        if (plugin) resolve(plugin);
        else reject(new Error("插件脚本已加载，但没有注册：" + id));
      };
      script.onerror = () => reject(new Error("插件脚本加载失败：" + id));
      document.head.appendChild(script);
    }).finally(() => loading.delete(id));

    loading.set(id, promise);
    return promise;
  }

  async function mount(id) {
    if (mounted.has(id)) return mounted.get(id);
    const plugin = await ensureLoaded(id);
    try {
      await ensureStyle(id);
      const cleanup = await plugin.mount(pluginApi(id));
      mounted.set(id, typeof cleanup === "function" ? cleanup : null);
      window.dispatchEvent(new CustomEvent("taskmatrix:plugin-mounted", { detail: { id } }));
      return cleanup;
    } catch (err) {
      removeStyle(id);
      throw err;
    }
  }

  async function unmount(id) {
    if (!mounted.has(id)) {
      removeStyle(id);
      return;
    }
    const cleanup = mounted.get(id);
    try {
      if (typeof cleanup === "function") await cleanup();
      else if (typeof registry.get(id)?.unmount === "function") {
        await registry.get(id).unmount(pluginApi(id));
      }
    } finally {
      mounted.delete(id);
      removeStyle(id);
      window.dispatchEvent(new CustomEvent("taskmatrix:plugin-unmounted", { detail: { id } }));
    }
  }

  async function install(id) {
    if (!entryFor(id)) throw new Error("插件不存在：" + id);
    const ids = getInstalled();
    if (!ids.includes(id)) setInstalled([...ids, id]);
    await mount(id);
    window.dispatchEvent(new CustomEvent("taskmatrix:plugin-installed", { detail: { id } }));
  }

  async function open(id) {
    if (!getInstalled().includes(id)) throw new Error("插件尚未安装：" + id);
    const plugin = await ensureLoaded(id);
    await mount(id);
    if (typeof plugin.open === "function") {
      return plugin.open(pluginApi(id));
    }
    window.dispatchEvent(new CustomEvent("taskmatrix:plugin-open", { detail: { id } }));
  }

  async function uninstall(id, options = {}) {
    await unmount(id);
    setInstalled(getInstalled().filter((x) => x !== id));
    if (options.purgeData) clearState(id);
    window.dispatchEvent(new CustomEvent("taskmatrix:plugin-uninstalled", { detail: { id } }));
  }

  function list() {
    const installed = new Set(getInstalled());
    return manifest.map((item) => ({
      ...item,
      installed: installed.has(item.id),
      loaded: registry.has(item.id),
      mounted: mounted.has(item.id),
    }));
  }

  function getSnapshot() {
    return {
      version: 1,
      installed: getInstalled(),
      state: getAllState(),
    };
  }

  async function restoreSnapshot(snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== "object") return;
    if (Array.isArray(snapshot.installed)) setInstalled(snapshot.installed, false);
    if (snapshot.state && typeof snapshot.state === "object" && !Array.isArray(snapshot.state)) {
      writeJSON(STATE_KEY, snapshot.state);
    }

    if (booted) {
      const target = new Set(getInstalled());
      for (const id of [...mounted.keys()]) {
        if (!target.has(id)) await unmount(id);
      }
      for (const id of target) {
        if (entryFor(id)) {
          try { await mount(id); } catch (err) { console.error("[plugins]", err); }
        }
      }
    }
    if (!options.silent) hostApi?.requestSave?.();
  }

  async function boot(api = {}) {
    hostApi = api;
    await loadManifest();
    booted = true;
    for (const id of getInstalled()) {
      if (!entryFor(id)) continue;
      try {
        await mount(id);
      } catch (err) {
        console.error("[plugins] failed to start", id, err);
        hostApi?.toast?.("插件启动失败：" + id);
      }
    }
    window.dispatchEvent(new CustomEvent("taskmatrix:plugins-ready"));
    return list();
  }

  window.TaskMatrixPlugins = Object.freeze({
    register,
    boot,
    install,
    uninstall,
    open,
    list,
    getSnapshot,
    restoreSnapshot,
    getState,
    setState,
    clearState,
    get installed() { return getInstalled(); },
  });
})();