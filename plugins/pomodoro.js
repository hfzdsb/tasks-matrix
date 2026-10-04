(() => {
  "use strict";

  let apiRef = null;
  let overlay = null;
  let timer = null;
  let launcher = null;
  let state = null;

  const defaults = () => ({
    mode: "focus",
    focusMin: 25,
    breakMin: 5,
    remaining: 25 * 60,
    running: false,
    endsAt: null,
    sessions: 0
  });

  function normalize(raw) {
    const d = defaults();
    const s = raw && typeof raw === "object" ? raw : {};
    const mode = s.mode === "break" ? "break" : "focus";
    const focusMin = Math.max(1, Math.min(180, Number(s.focusMin) || d.focusMin));
    const breakMin = Math.max(1, Math.min(60, Number(s.breakMin) || d.breakMin));
    const base = mode === "focus" ? focusMin * 60 : breakMin * 60;
    let remaining = Number.isFinite(Number(s.remaining)) ? Number(s.remaining) : base;
    let running = Boolean(s.running);
    let endsAt = Number(s.endsAt) || null;

    if (running && endsAt) {
      remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        running = false;
        endsAt = null;
      }
    }

    return {
      mode,
      focusMin,
      breakMin,
      remaining: Math.max(0, remaining),
      running,
      endsAt,
      sessions: Math.max(0, Number(s.sessions) || 0)
    };
  }

  function save() {
    apiRef?.storage.set(state);
  }

  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function injectStyle(){ return null; }

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function totalForMode() {
    return (state.mode === "focus" ? state.focusMin : state.breakMin) * 60;
  }

  function syncRemaining() {
    if (state.running && state.endsAt) {
      state.remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
      if (state.remaining <= 0) finishPhase();
    }
  }

  function finishPhase() {
    const finished = state.mode;
    if (finished === "focus") state.sessions += 1;
    state.mode = finished === "focus" ? "break" : "focus";
    state.remaining = totalForMode();
    state.running = false;
    state.endsAt = null;
    save();
    apiRef?.host.toast(finished === "focus" ? "专注完成，休息一下 ☕" : "休息结束，可以继续专注了");
    render();
  }

  function start() {
    syncRemaining();
    if (state.remaining <= 0) state.remaining = totalForMode();
    state.running = true;
    state.endsAt = Date.now() + state.remaining * 1000;
    save();
    ensureTimer();
    render();
  }

  function pause() {
    syncRemaining();
    state.running = false;
    state.endsAt = null;
    save();
    render();
  }

  function reset() {
    state.running = false;
    state.endsAt = null;
    state.remaining = totalForMode();
    save();
    render();
  }

  function switchMode(mode) {
    state.mode = mode;
    state.running = false;
    state.endsAt = null;
    state.remaining = totalForMode();
    save();
    render();
  }

  function setPreset(focusMin, breakMin) {
    state.focusMin = focusMin;
    state.breakMin = breakMin;
    state.running = false;
    state.endsAt = null;
    state.remaining = totalForMode();
    save();
    render();
  }

  function render() {
    if (!overlay) return;
    syncRemaining();
    const time = overlay.querySelector("[data-pomo-time]");
    const mode = overlay.querySelector("[data-pomo-mode]");
    const progress = overlay.querySelector("[data-pomo-progress]");
    const toggle = overlay.querySelector("[data-pomo-toggle]");
    const sessions = overlay.querySelector("[data-pomo-sessions]");

    if (time) time.textContent = fmt(state.remaining);
    if (mode) mode.textContent = state.mode === "focus" ? "专 注" : "休 息";
    if (toggle) toggle.textContent = state.running ? "暂停" : "开始";
    if (sessions) sessions.textContent = "今日累计专注 " + state.sessions + " 轮";
    if (progress) {
      const total = Math.max(1, totalForMode());
      progress.style.width = Math.max(0, Math.min(100, (1 - state.remaining / total) * 100)) + "%";
    }

    if (launcher?.children?.[1]) {
      launcher.children[1].textContent = state.running ? fmt(state.remaining) : "番茄钟";
    }
  }

  function ensureTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!state?.running) return;
      render();
      if (Date.now() % 5000 < 1000) save();
    }, 1000);
  }

  function build() {
    overlay = make("div", "tm-pomo-overlay");
    const card = make("section", "tm-pomo-card");
    const head = make("div", "tm-pomo-head");
    const intro = make("div");
    intro.append(make("h2", "", "番茄钟"), make("p", "", "把注意力留给一件事。"));
    const close = make("button", "tm-pomo-x", "×");
    close.type = "button";
    close.addEventListener("click", () => overlay.classList.remove("open"));
    head.append(intro, close);

    const mode = make("div", "tm-pomo-mode"); mode.dataset.pomoMode = "";
    const time = make("div", "tm-pomo-time"); time.dataset.pomoTime = "";
    const progress = make("div", "tm-pomo-progress");
    const progressInner = document.createElement("div"); progressInner.dataset.pomoProgress = "";
    progress.appendChild(progressInner);

    const actions = make("div", "tm-pomo-actions");
    const focus = make("button", "tm-pomo-secondary", "专注");
    const toggle = make("button", "tm-pomo-start", "开始"); toggle.dataset.pomoToggle = "";
    const rest = make("button", "tm-pomo-secondary", "休息");
    focus.addEventListener("click", () => switchMode("focus"));
    rest.addEventListener("click", () => switchMode("break"));
    toggle.addEventListener("click", () => state.running ? pause() : start());
    actions.append(focus, toggle, rest);

    const presets = make("div", "tm-pomo-presets");
    for (const [label, f, b] of [["25 / 5",25,5],["50 / 10",50,10],["90 / 20",90,20]]) {
      const btn = make("button", "", label);
      btn.type = "button";
      btn.addEventListener("click", () => setPreset(f,b));
      presets.appendChild(btn);
    }

    const info = make("div", "tm-pomo-info");
    const sessionText = make("span", "", ""); sessionText.dataset.pomoSessions = "";
    const resetBtn = make("button", "tm-pomo-secondary", "重置本轮");
    resetBtn.type = "button";
    resetBtn.style.padding = "6px 9px";
    resetBtn.addEventListener("click", reset);
    info.append(sessionText, resetBtn);

    card.append(head, mode, time, progress, actions, presets, info);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    document.body.appendChild(overlay);
  }

  function open() {
    overlay?.classList.add("open");
    render();
  }

  window.TaskMatrixPlugins.register({
    id: "pomodoro",
    async mount(api) {
      apiRef = api;
      state = normalize(api.storage.get(defaults()));
      injectStyle();
      build();
      launcher = api.host.addLauncher({
        icon: "🍅",
        label: "番茄钟",
        title: "打开番茄钟",
        onClick: open
      });
      ensureTimer();
      render();
      return () => {
        clearInterval(timer);
        timer = null;
        api.host.removeLauncher();
        launcher = null;
        overlay?.remove();
        overlay = null;
        document.getElementById("tm-pomo-style")?.remove();
        apiRef = null;
      };
    },
    open
  });
})();