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

  function injectStyle() {
    if (document.getElementById("tm-notes-style")) return;
    const s = document.createElement("style");
    s.id = "tm-notes-style";
    s.textContent = `
      .tm-notes-overlay{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.74);backdrop-filter:blur(5px)}
      .tm-notes-overlay.open{display:flex}.tm-notes-card{width:min(650px,96vw);max-height:86vh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#111827;color:#fff;box-shadow:0 26px 80px rgba(0,0,0,.55);font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-notes-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.tm-notes-head h2{margin:0;font-size:19px}.tm-notes-head p{margin:4px 0 0;color:#94a3b8;font-size:12px}.tm-notes-x{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-notes-compose{padding:14px;border-bottom:1px solid rgba(255,255,255,.08)}.tm-notes-compose textarea{width:100%;min-height:90px;resize:vertical;border:1px solid #334155;border-radius:12px;background:#0b1220;color:#fff;padding:11px 12px;outline:none;font-family:inherit}.tm-notes-compose textarea:focus{border-color:#818cf8}
      .tm-notes-compose-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px}.tm-notes-count{font-size:11px;color:#64748b}.tm-notes-add{border:0;border-radius:10px;background:#4f46e5;color:#fff;padding:9px 16px;cursor:pointer}
      .tm-notes-list{overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.tm-note{position:relative;min-height:110px;padding:13px 34px 12px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(30,41,59,.68)}
      .tm-note-text{white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.55;color:#e2e8f0}.tm-note-time{margin-top:10px;color:#64748b;font-size:10px}.tm-note-del{position:absolute;right:8px;top:7px;border:0;background:transparent;color:#64748b;cursor:pointer;font-size:17px}.tm-note-del:hover{color:#f87171}
      .tm-notes-empty{grid-column:1/-1;text-align:center;color:#64748b;padding:28px}
    `;
    document.head.appendChild(s);
  }

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