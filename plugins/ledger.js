(() => {
  "use strict";

  let apiRef = null;
  let panel = null;
  let styleEl = null;
  let state = { records: [], open: false };
  let type = 1;
  let clearArmed = false;
  let clearTimer = null;

  const LEGACY_DATA_KEY = "ledgerV1";
  const LEGACY_OPEN_KEY = "ledgerOpenV1";

  function normalizeRecord(x) {
    const amt = Number(x?.amt);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return {
      id: x?.id ?? (Date.now() + Math.random()),
      t: Number(x?.t) === 0 ? 0 : 1,
      amt: Math.round(amt * 100) / 100,
      note: String(x?.note || "").slice(0, 40),
    };
  }

  function loadState(api) {
    const saved = api.storage.get(null);
    if (saved && Array.isArray(saved.records)) {
      return {
        records: saved.records.map(normalizeRecord).filter(Boolean),
        open: Boolean(saved.open),
      };
    }

    let records = [];
    let open = false;
    try {
      const raw = localStorage.getItem(LEGACY_DATA_KEY);
      if (raw) {
        const legacy = JSON.parse(raw);
        if (Array.isArray(legacy)) records = legacy.map(normalizeRecord).filter(Boolean);
      }
      open = localStorage.getItem(LEGACY_OPEN_KEY) === "1";
    } catch (err) {
      console.warn("[ledger] legacy migration failed:", err);
    }

    const migrated = { records, open: false };
    api.storage.set(migrated);
    return migrated;
  }

  function save() {
    apiRef?.storage.set({
      records: state.records,
      open: state.open,
    });
  }

  function injectStyles() {
    if (document.getElementById("tm-ledger-style")) return document.getElementById("tm-ledger-style");
    const s = document.createElement("style");
    s.id = "tm-ledger-style";
    s.textContent = `
      .tm-ledger{position:fixed;top:0;right:0;bottom:0;width:min(360px,calc(100vw - 14px));z-index:60;display:flex;flex-direction:column;background:rgba(13,20,38,.985);border-left:1px solid rgba(255,255,255,.12);box-shadow:-16px 0 48px rgba(0,0,0,.5);transform:translateX(102%);transition:transform .23s ease;color:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-ledger.open{transform:translateX(0)}
      .tm-ledger-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:15px 15px 12px;border-bottom:1px solid rgba(255,255,255,.09)}
      .tm-ledger-title{font-weight:700;letter-spacing:1px}.tm-ledger-sub{font-size:11px;color:#94a3b8;margin-top:3px}
      .tm-ledger-close{border:0;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer}
      .tm-ledger-add{display:grid;grid-template-columns:auto 88px 1fr 36px;gap:6px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
      .tm-ledger-switch{display:flex;border:1px solid rgba(255,255,255,.16);border-radius:9px;overflow:hidden}
      .tm-ledger-switch button{border:0;background:transparent;color:#cbd5e1;padding:7px 9px;cursor:pointer}.tm-ledger-switch .on.in{background:#15803d;color:#fff}.tm-ledger-switch .on.out{background:#b91c1c;color:#fff}
      .tm-ledger input{min-width:0;width:100%;border:1px solid #334155;border-radius:8px;background:#0b1220;color:#fff;padding:8px;outline:none}.tm-ledger input:focus{border-color:#818cf8}
      .tm-ledger-go{height:34px;border:0;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:17px;cursor:pointer}
      .tm-ledger-list{flex:1;overflow:auto;padding:9px 10px}.tm-ledger-list table{width:100%;border-collapse:separate;border-spacing:0 6px;table-layout:fixed}.tm-ledger-list th{font-size:12px;letter-spacing:3px;padding-bottom:3px}.tm-ledger-list th.in{color:#4ade80}.tm-ledger-list th.out{color:#f87171}
      .tm-ledger-list td{width:50%;position:relative;vertical-align:top;background:rgba(255,255,255,.045);border-radius:10px;padding:8px 10px}.tm-ledger-list td.empty{text-align:center;color:#475569}.tm-ledger-amt{font-weight:700;font-size:13px}.tm-ledger-list td.in .tm-ledger-amt{color:#4ade80}.tm-ledger-list td.out .tm-ledger-amt{color:#f87171}
      .tm-ledger-note{font-size:11px;color:#94a3b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tm-ledger-del{position:absolute;top:4px;right:5px;border:0;background:transparent;color:#64748b;cursor:pointer}.tm-ledger-del:hover{color:#f87171}
      .tm-ledger-total td{text-align:center;background:rgba(255,255,255,.09)}
      .tm-ledger-summary{padding:12px 14px 14px;border-top:1px solid rgba(255,255,255,.09);background:rgba(2,6,23,.5)}.tm-ledger-summary-top{display:flex;justify-content:space-between;align-items:center}.tm-ledger-label{font-size:11px;color:#94a3b8}.tm-ledger-diff{font-size:24px;font-weight:800;margin-top:2px}.tm-ledger-diff.pos{color:#4ade80}.tm-ledger-diff.neg{color:#f87171}.tm-ledger-diff.zero{color:#cbd5e1}
      .tm-ledger-bar{height:9px;border-radius:7px;overflow:hidden;display:flex;margin:10px 0 5px;background:rgba(255,255,255,.07)}.tm-ledger-bi{background:#22c55e}.tm-ledger-bo{background:#ef4444}.tm-ledger-foot{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}.tm-ledger-tools{display:flex;justify-content:flex-end;margin-top:10px}
      .tm-ledger-clear{border:1px solid rgba(255,255,255,.15);border-radius:999px;background:transparent;color:#94a3b8;padding:5px 11px;cursor:pointer}.tm-ledger-clear.armed{border-color:#ef4444;color:#fecaca;background:rgba(127,29,29,.25)}
      @media(max-width:520px){.tm-ledger-add{grid-template-columns:auto 82px 1fr 34px}.tm-ledger{width:calc(100vw - 8px)}}
    `;
    document.head.appendChild(s);
    return s;
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmt(n) {
    return "¥" + Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }

  function setOpen(value, persist = true) {
    state.open = Boolean(value);
    panel?.classList.toggle("open", state.open);
    if (persist) save();
  }

  function makeCell(rec, isIn) {
    const td = el("td", isIn ? "in" : "out");
    if (!rec) {
      td.classList.add("empty");
      td.textContent = "—";
      return td;
    }
    const amount = el("div", "tm-ledger-amt", (isIn ? "+" : "-") + fmt(rec.amt));
    td.appendChild(amount);
    if (rec.note) td.appendChild(el("div", "tm-ledger-note", rec.note));
    const del = el("button", "tm-ledger-del", "×");
    del.type = "button";
    del.title = "删除";
    del.addEventListener("click", () => {
      state.records = state.records.filter((x) => x.id !== rec.id);
      save();
      render();
    });
    td.appendChild(del);
    return td;
  }

  function render() {
    if (!panel) return;
    const body = panel.querySelector("[data-ledger-body]");
    const ins = [];
    const outs = [];
    let tin = 0;
    let tout = 0;

    for (const item of state.records) {
      if (item.t === 1) { ins.push(item); tin += item.amt; }
      else { outs.push(item); tout += item.amt; }
    }

    body.textContent = "";
    const frag = document.createDocumentFragment();
    const count = Math.max(ins.length, outs.length);
    for (let i = 0; i < count; i++) {
      const tr = document.createElement("tr");
      tr.append(makeCell(ins[i], true), makeCell(outs[i], false));
      frag.appendChild(tr);
    }
    const total = el("tr", "tm-ledger-total");
    const t1 = el("td"); t1.appendChild(el("div", "tm-ledger-amt", fmt(tin)));
    const t2 = el("td"); t2.appendChild(el("div", "tm-ledger-amt", fmt(tout)));
    total.append(t1, t2);
    frag.appendChild(total);
    body.appendChild(frag);

    const diff = tin - tout;
    const diffEl = panel.querySelector("[data-ledger-diff]");
    diffEl.className = "tm-ledger-diff " + (diff > 0 ? "pos" : diff < 0 ? "neg" : "zero");
    diffEl.textContent = diff === 0 ? "¥0" : (diff > 0 ? "+" : "-") + fmt(Math.abs(diff));

    panel.querySelector("[data-ledger-in]").textContent = "收入 " + fmt(tin);
    panel.querySelector("[data-ledger-out]").textContent = "支出 " + fmt(tout);
    const bi = panel.querySelector("[data-ledger-bi]");
    const bo = panel.querySelector("[data-ledger-bo]");
    bi.style.flexGrow = Math.round(tin * 100) + 1;
    bo.style.flexGrow = Math.round(tout * 100) + 1;
  }

  function buildPanel(api) {
    panel = el("aside", "tm-ledger");
    panel.id = "tmLedgerPlugin";

    const head = el("header", "tm-ledger-head");
    const titleWrap = el("div");
    titleWrap.append(el("div", "tm-ledger-title", "收支记账"), el("div", "tm-ledger-sub", "收入 − 支出 = 当前差额"));
    const close = el("button", "tm-ledger-close", "×");
    close.type = "button";
    close.addEventListener("click", () => setOpen(false));
    head.append(titleWrap, close);

    const add = el("div", "tm-ledger-add");
    const sw = el("div", "tm-ledger-switch");
    const inBtn = el("button", "on in", "收");
    const outBtn = el("button", "", "支");
    inBtn.type = outBtn.type = "button";
    const choose = (v) => {
      type = v;
      inBtn.className = v === 1 ? "on in" : "";
      outBtn.className = v === 0 ? "on out" : "";
    };
    inBtn.addEventListener("click", () => choose(1));
    outBtn.addEventListener("click", () => choose(0));
    sw.append(inBtn, outBtn);

    const amt = document.createElement("input");
    amt.type = "number"; amt.min = "0"; amt.step = "0.01"; amt.placeholder = "金额";
    const note = document.createElement("input");
    note.type = "text"; note.maxLength = 40; note.placeholder = "备注";
    const go = el("button", "tm-ledger-go", "+"); go.type = "button";

    const addRecord = () => {
      const value = Number(amt.value);
      if (!Number.isFinite(value) || value <= 0) {
        amt.focus();
        api.host.toast("请输入有效金额");
        return;
      }
      state.records.push({
        id: Date.now() + Math.random(),
        t: type,
        amt: Math.round(value * 100) / 100,
        note: note.value.trim().slice(0, 40),
      });
      amt.value = "";
      note.value = "";
      save();
      render();
      amt.focus();
    };
    go.addEventListener("click", addRecord);
    amt.addEventListener("keydown", (e) => { if (e.key === "Enter") addRecord(); });
    add.append(sw, amt, note, go);

    const list = el("div", "tm-ledger-list");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.append(el("th", "in", "收 入"), el("th", "out", "支 出"));
    thead.appendChild(hr);
    const tbody = document.createElement("tbody");
    tbody.dataset.ledgerBody = "";
    table.append(thead, tbody);
    list.appendChild(table);

    const summary = el("div", "tm-ledger-summary");
    const top = el("div", "tm-ledger-summary-top");
    top.appendChild(el("span", "tm-ledger-label", "差额（收入−支出）"));
    summary.append(top);
    const diff = el("div", "tm-ledger-diff zero", "¥0"); diff.dataset.ledgerDiff = "";
    summary.appendChild(diff);
    const bar = el("div", "tm-ledger-bar");
    const bi = el("div", "tm-ledger-bi"); bi.dataset.ledgerBi = "";
    const bo = el("div", "tm-ledger-bo"); bo.dataset.ledgerBo = "";
    bar.append(bi, bo); summary.appendChild(bar);
    const foot = el("div", "tm-ledger-foot");
    const inTotal = el("span", "", "收入 ¥0"); inTotal.dataset.ledgerIn = "";
    const outTotal = el("span", "", "支出 ¥0"); outTotal.dataset.ledgerOut = "";
    foot.append(inTotal, outTotal); summary.appendChild(foot);

    const tools = el("div", "tm-ledger-tools");
    const clear = el("button", "tm-ledger-clear", "清空记录");
    clear.type = "button";
    clear.addEventListener("click", () => {
      if (!clearArmed) {
        clearArmed = true;
        clear.classList.add("armed");
        clear.textContent = "再点一次确认";
        clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          clearArmed = false;
          clear.classList.remove("armed");
          clear.textContent = "清空记录";
        }, 3000);
        return;
      }
      state.records = [];
      clearArmed = false;
      clear.classList.remove("armed");
      clear.textContent = "清空记录";
      save();
      render();
    });
    tools.appendChild(clear);
    summary.appendChild(tools);

    panel.append(head, add, list, summary);
    document.body.appendChild(panel);
  }

  function open() {
    if (!panel) return;
    setOpen(true);
  }

  window.TaskMatrixPlugins.register({
    id: "ledger",

    async mount(api) {
      apiRef = api;
      state = loadState(api);
      styleEl = injectStyles();
      buildPanel(api);
      render();
      setOpen(false, false);

      api.host.addLauncher({
        icon: "📒",
        label: "记账",
        title: "打开收支记账",
        onClick: open,
      });

      return () => {
        clearTimeout(clearTimer);
        api.host.removeLauncher();
        panel?.remove();
        panel = null;
        styleEl?.remove();
        styleEl = null;
        apiRef = null;
      };
    },

    open,
  });
})();