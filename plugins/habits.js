(() => {
  "use strict";
  let apiRef=null,overlay=null,listEl=null,state={habits:[]};

  const dayKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  function load(api){const s=api.storage.get({habits:[]});return{habits:Array.isArray(s?.habits)?s.habits:[]};}
  function save(){apiRef?.storage.set(state);}
  function streak(h){
    const set=new Set(Array.isArray(h.dates)?h.dates:[]);let d=new Date(),n=0;
    if(!set.has(dayKey(d)))d.setDate(d.getDate()-1);
    while(set.has(dayKey(d))){n++;d.setDate(d.getDate()-1);}
    return n;
  }
  function last7(h){
    const set=new Set(Array.isArray(h.dates)?h.dates:[]);let n=0,d=new Date();
    for(let i=0;i<7;i++){if(set.has(dayKey(d)))n++;d.setDate(d.getDate()-1);}return n;
  }
  function style(){
    if(document.getElementById("tm-habit-style"))return;
    const s=document.createElement("style");s.id="tm-habit-style";s.textContent=`
      .tm-habit-ov{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}.tm-habit-ov.open{display:flex}
      .tm-habit{width:min(520px,94vw);max-height:88vh;overflow:auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:18px;color:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.tm-habit-head{display:flex;justify-content:space-between;align-items:center}.tm-habit-head h3{margin:0}.tm-habit-head button{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-habit-add{display:flex;gap:8px;margin:15px 0}.tm-habit-add input{flex:1;border:1px solid #334155;border-radius:10px;background:#0b1220;color:#fff;padding:10px}.tm-habit-add button{border:0;border-radius:10px;background:#16a34a;color:#fff;padding:0 15px;cursor:pointer}
      .tm-habit-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 8px;border-bottom:1px solid rgba(255,255,255,.07)}.tm-habit-check{width:28px;height:28px;border-radius:9px;border:1px solid #475569;background:#0f172a;color:#fff;cursor:pointer}.tm-habit-check.done{background:#16a34a;border-color:#22c55e}.tm-habit-name{font-size:14px}.tm-habit-meta{font-size:11px;color:#94a3b8;margin-top:3px}.tm-habit-del{border:0;background:transparent;color:#64748b;cursor:pointer}.tm-habit-del:hover{color:#f87171}
    `;document.head.appendChild(s);
  }
  function render(){
    if(!listEl)return;listEl.textContent="";const today=dayKey();
    if(!state.habits.length){const e=document.createElement("div");e.style.color="#94a3b8";e.style.padding="16px 0";e.textContent="添加一个想长期坚持的习惯。";listEl.appendChild(e);return;}
    for(const h of state.habits){
      h.dates=Array.isArray(h.dates)?h.dates:[];
      const row=document.createElement("div");row.className="tm-habit-row";
      const check=document.createElement("button");check.type="button";check.className="tm-habit-check"+(h.dates.includes(today)?" done":"");check.textContent=h.dates.includes(today)?"✓":"";
      check.addEventListener("click",()=>{if(h.dates.includes(today))h.dates=h.dates.filter(x=>x!==today);else h.dates.push(today);save();render();});
      const mid=document.createElement("div");const name=document.createElement("div");name.className="tm-habit-name";name.textContent=h.name;
      const meta=document.createElement("div");meta.className="tm-habit-meta";meta.textContent="连续 "+streak(h)+" 天 · 最近7天 "+last7(h)+"/7";mid.append(name,meta);
      const del=document.createElement("button");del.type="button";del.className="tm-habit-del";del.textContent="删除";del.addEventListener("click",()=>{state.habits=state.habits.filter(x=>x.id!==h.id);save();render();});
      row.append(check,mid,del);listEl.appendChild(row);
    }
  }
  function open(){overlay?.classList.add("open");render();}
  window.TaskMatrixPlugins.register({
    id:"habits",
    async mount(api){
      apiRef=api;state=load(api);style();
      overlay=document.createElement("div");overlay.className="tm-habit-ov";
      const box=document.createElement("section");box.className="tm-habit";box.innerHTML=`<div class="tm-habit-head"><h3>✅ 习惯打卡</h3><button type="button">×</button></div><div class="tm-habit-add"><input maxlength="30" placeholder="例如：跑步 20 分钟"><button type="button">添加</button></div><div class="tm-habit-list"></div>`;
      overlay.appendChild(box);document.body.appendChild(overlay);listEl=box.querySelector(".tm-habit-list");
      const input=box.querySelector(".tm-habit-add input"),add=box.querySelector(".tm-habit-add button");
      const create=()=>{const name=input.value.trim();if(!name)return;state.habits.push({id:Date.now()+Math.random(),name:name.slice(0,30),dates:[]});input.value="";save();render();};
      add.addEventListener("click",create);input.addEventListener("keydown",e=>{if(e.key==="Enter")create();});
      box.querySelector(".tm-habit-head button").addEventListener("click",()=>overlay.classList.remove("open"));
      overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)overlay.classList.remove("open");});
      api.host.addLauncher({icon:"✅",label:"习惯",onClick:open});render();
      return()=>{api.host.removeLauncher();overlay?.remove();overlay=null;document.getElementById("tm-habit-style")?.remove();apiRef=null;};
    },
    open
  });
})();