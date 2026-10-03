(() => {
  "use strict";

  let apiRef = null;
  let overlay = null;
  let habits = [];

  function todayKey(offset=0) {
    const d = new Date();
    d.setDate(d.getDate()+offset);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  function normalize(raw) {
    const list = Array.isArray(raw?.habits) ? raw.habits : [];
    return list.map((h)=>({
      id:h?.id ?? (Date.now()+Math.random()),
      name:String(h?.name||"").slice(0,50),
      checks:h?.checks && typeof h.checks==="object" && !Array.isArray(h.checks) ? h.checks : {}
    })).filter(h=>h.name.trim());
  }

  function save() { apiRef?.storage.set({habits}); }

  function streak(habit) {
    let n=0;
    for(let i=0;i<3660;i++){
      if(habit.checks[todayKey(-i)]) n++;
      else break;
    }
    return n;
  }

  function injectStyle(){
    if(document.getElementById("tm-habit-style")) return;
    const s=document.createElement("style");
    s.id="tm-habit-style";
    s.textContent=`
      .tm-habit-overlay{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.74);backdrop-filter:blur(5px)}
      .tm-habit-overlay.open{display:flex}.tm-habit-card{width:min(620px,96vw);max-height:86vh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#111827;color:#fff;box-shadow:0 26px 80px rgba(0,0,0,.55);font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-habit-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.tm-habit-head h2{margin:0;font-size:19px}.tm-habit-head p{margin:4px 0 0;color:#94a3b8;font-size:12px}.tm-habit-x{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-habit-add{display:flex;gap:8px;padding:13px;border-bottom:1px solid rgba(255,255,255,.08)}.tm-habit-add input{flex:1;min-width:0;border:1px solid #334155;border-radius:10px;background:#0b1220;color:#fff;padding:10px 11px;outline:none}.tm-habit-add input:focus{border-color:#818cf8}.tm-habit-add button{border:0;border-radius:10px;background:#4f46e5;color:#fff;padding:9px 14px;cursor:pointer}
      .tm-habit-list{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:9px}.tm-habit-row{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px;padding:11px 12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(30,41,59,.62)}
      .tm-habit-check{width:32px;height:32px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff;cursor:pointer;font-size:16px}.tm-habit-check.on{background:#16a34a;border-color:#4ade80}.tm-habit-name{font-size:13px}.tm-habit-streak{font-size:11px;color:#94a3b8;white-space:nowrap}.tm-habit-del{border:0;background:transparent;color:#64748b;cursor:pointer;font-size:17px}.tm-habit-del:hover{color:#f87171}
      .tm-habit-empty{text-align:center;color:#64748b;padding:28px}.tm-habit-summary{padding:0 14px 14px;color:#94a3b8;font-size:12px}
    `;
    document.head.appendChild(s);
  }

  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(text!=null) el.textContent=text;
    return el;
  }

  function render(){
    if(!overlay) return;
    const list=overlay.querySelector("[data-habit-list]");
    const summary=overlay.querySelector("[data-habit-summary]");
    list.textContent="";
    const today=todayKey();
    let done=0;
    if(!habits.length){
      list.appendChild(make("div","tm-habit-empty","还没有习惯。先添加一个你真正想坚持的小目标。"));
    } else {
      for(const h of habits){
        const row=make("div","tm-habit-row");
        const check=make("button","tm-habit-check"+(h.checks[today]?" on":""),h.checks[today]?"✓":"");
        check.type="button";
        check.title="切换今日打卡";
        check.addEventListener("click",()=>{
          if(h.checks[today]) delete h.checks[today];
          else h.checks[today]=true;
          save();
          render();
        });
        const name=make("div","tm-habit-name",h.name);
        const st=streak(h);
        const streakEl=make("div","tm-habit-streak",st?("连续 "+st+" 天"):"尚未连续");
        const del=make("button","tm-habit-del","×");
        del.type="button";
        del.title="删除习惯";
        del.addEventListener("click",()=>{
          if(!confirm("删除习惯“"+h.name+"”？历史打卡也会一起删除。")) return;
          habits=habits.filter(x=>x.id!==h.id);
          save();
          render();
        });
        row.append(check,name,streakEl,del);
        list.appendChild(row);
        if(h.checks[today]) done++;
      }
    }
    summary.textContent="今天完成 "+done+" / "+habits.length;
  }

  function build(){
    overlay=make("div","tm-habit-overlay");
    const card=make("section","tm-habit-card");
    const head=make("div","tm-habit-head");
    const intro=make("div");
    intro.append(make("h2","", "习惯打卡"),make("p","", "每天一点点，比偶尔用力更容易坚持。"));
    const close=make("button","tm-habit-x","×");
    close.type="button";
    close.addEventListener("click",()=>overlay.classList.remove("open"));
    head.append(intro,close);

    const add=make("div","tm-habit-add");
    const input=document.createElement("input");
    input.maxLength=50;
    input.placeholder="例如：阅读 20 分钟";
    const addBtn=make("button","", "添加");
    addBtn.type="button";
    const submit=()=>{
      const name=input.value.trim();
      if(!name) return;
      habits.push({id:Date.now()+Math.random(),name,checks:{}});
      input.value="";
      save();
      render();
    };
    addBtn.addEventListener("click",submit);
    input.addEventListener("keydown",(e)=>{if(e.key==="Enter") submit();});
    add.append(input,addBtn);

    const list=make("div","tm-habit-list");
    list.dataset.habitList="";
    const summary=make("div","tm-habit-summary","");
    summary.dataset.habitSummary="";

    card.append(head,add,list,summary);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown",(e)=>{if(e.target===overlay) overlay.classList.remove("open");});
    document.body.appendChild(overlay);
  }

  function open(){
    overlay?.classList.add("open");
    render();
    setTimeout(()=>overlay?.querySelector("input")?.focus(),0);
  }

  window.TaskMatrixPlugins.register({
    id:"habits",
    async mount(api){
      apiRef=api;
      habits=normalize(api.storage.get({habits:[]}));
      injectStyle();
      build();
      api.host.addLauncher({icon:"✅",label:"习惯",title:"打开习惯打卡",onClick:open});
      render();
      return ()=>{
        api.host.removeLauncher();
        overlay?.remove();
        overlay=null;
        document.getElementById("tm-habit-style")?.remove();
        apiRef=null;
      };
    },
    open
  });
})();