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

  function injectStyles(){ return null; }

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