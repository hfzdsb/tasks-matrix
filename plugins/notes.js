(() => {
  "use strict";

  let apiRef = null;
  let overlay = null;
  let notes = [];

  function normalize(raw) {
    const list = Array.isArray(raw?.notes) ? raw.notes : [];
    return list.map((n) => ({
      id: n?.id ?? (Date.now() + Math.random()),
      text: String(n?.text || "").slice(0, 1000),
      createdAt: Number(n?.createdAt) || Date.now()
    })).filter((n) => n.text.trim());
  }

  function save() {
    apiRef?.storage.set({ notes });
  }

  function injectStyle(){ return null; }

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function render() {
    if (!overlay) return;
    const list = overlay.querySelector("[data-notes-list]");
    list.textContent = "";
    if (!notes.length) {
      list.appendChild(make("div", "tm-notes-empty", "还没有便签。把临时想法先放这里。"));
      return;
    }
    [...notes].sort((a,b)=>b.createdAt-a.createdAt).forEach((note) => {
      const card = make("article", "tm-note");
      card.appendChild(make("div", "tm-note-text", note.text));
      card.appendChild(make("div", "tm-note-time", new Date(note.createdAt).toLocaleString("zh-CN")));
      const del = make("button", "tm-note-del", "×");
      del.type = "button";
      del.title = "删除便签";
      del.addEventListener("click", () => {
        notes = notes.filter((n) => n.id !== note.id);
        save();
        render();
      });
      card.appendChild(del);
      list.appendChild(card);
    });
  }

  function build() {
    overlay = make("div", "tm-notes-overlay");
    const card = make("section", "tm-notes-card");

    const head = make("div", "tm-notes-head");
    const intro = make("div");
    intro.append(make("h2", "", "速记便签"), make("p", "", "临时信息先记下，不打断当前任务。"));
    const close = make("button", "tm-notes-x", "×");
    close.type = "button";
    close.addEventListener("click", () => overlay.classList.remove("open"));
    head.append(intro, close);

    const compose = make("div", "tm-notes-compose");
    const input = document.createElement("textarea");
    input.maxLength = 1000;
    input.placeholder = "记点什么……";
    const row = make("div", "tm-notes-compose-row");
    const count = make("span", "tm-notes-count", "0 / 1000");
    input.addEventListener("input", () => count.textContent = input.value.length + " / 1000");
    const add = make("button", "tm-notes-add", "保存便签");
    add.type = "button";
    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      notes.push({ id: Date.now() + Math.random(), text, createdAt: Date.now() });
      input.value = "";
      count.textContent = "0 / 1000";
      save();
      render();
      apiRef?.host.toast("便签已保存");
    };
    add.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
    });
    row.append(count, add);
    compose.append(input, row);

    const list = make("div", "tm-notes-list");
    list.dataset.notesList = "";

    card.append(head, compose, list);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    document.body.appendChild(overlay);
  }

  function open() {
    overlay?.classList.add("open");
    render();
    setTimeout(() => overlay?.querySelector("textarea")?.focus(), 0);
  }

  window.TaskMatrixPlugins.register({
    id: "notes",
    async mount(api) {
      apiRef = api;
      notes = normalize(api.storage.get({ notes: [] }));
      injectStyle();
      build();
      api.host.addLauncher({
        icon: "🗒️",
        label: "便签",
        title: "打开速记便签",
        onClick: open
      });
      render();
      return () => {
        api.host.removeLauncher();
        overlay?.remove();
        overlay = null;
        document.getElementById("tm-notes-style")?.remove();
        apiRef = null;
      };
    },
    open
  });
})();