(() => {
  "use strict";
  let apiRef=null,overlay=null,listEl=null,state={items:[]},timer=null;
  function load(api){const s=api.storage.get({items:[]});return{items:Array.isArray(s?.items)?s.items:[]};}
  function save(){apiRef?.storage.set(state);}
  function left(ms){
    if(ms<=0)return"已到时间";
    const sec=Math.floor(ms/1000),d=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),m=Math.floor(sec%3600/60),s=sec%60;
    return (d?d+"天 ":"")+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }
  function style(){
    if(document.getElementById("tm-count-style"))return;
    const s=document.createElement("style");s.id="tm-count-style";s.textContent=`
      .tm-count-ov{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}.tm-count-ov.open{display:flex}
      .tm-count{width:min(560px,94vw);max-height:88vh;overflow:auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:18px;color:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.tm-count-head{display:flex;justify-content:space-between;align-items:center}.tm-count-head h3{margin:0}.tm-count-head button{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-count-add{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin:15px 0}.tm-count-add input{min-width:0;border:1px solid #334155;border-radius:10px;background:#0b1220;color:#fff;padding:9px}.tm-count-add button{border:0;border-radius:10px;background:#7c3aed;color:#fff;padding:0 15px;cursor:pointer}
      .tm-count-row{padding:12px 9px;border-bottom:1px solid rgba(255,255,255,.07)}.tm-count-top{display:flex;justify-content:space-between;gap:10px}.tm-count-name{font-weight:700}.tm-count-del{border:0;background:transparent;color:#64748b;cursor:pointer}.tm-count-time{font-size:23px;font-weight:800;color:#c4b5fd;margin-top:6px}.tm-count-date{font-size:11px;color:#94a3b8;margin-top:3px}
      @media(max-width:520px){.tm-count-add{grid-template-columns:1fr}.tm-count-add button{padding:9px}}
    `;document.head.appendChild(s);
  }
  function render(){
    if(!listEl)return;const now=Date.now();listEl.textContent="";
    const items=[...state.items].sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0));
    if(!items.length){const e=document.createElement("div");e.style.color="#94a3b8";e.style.padding="16px 0";e.textContent="添加考试、截止日期、旅行等重要时间点。";listEl.appendChild(e);return;}
    for(const item of items){
      const row=document.createElement("div");row.className="tm-count-row";
      const top=document.createElement("div");top.className="tm-count-top";
      const name=document.createElement("div");name.className="tm-count-name";name.textContent=item.title||"未命名";
      const del=document.createElement("button");del.type="button";del.className="tm-count-del";del.textContent="删除";del.addEventListener("click",()=>{state.items=state.items.filter(x=>x.id!==item.id);save();render();});
      top.append(name,del);
      const time=document.createElement("div");time.className="tm-count-time";time.textContent=left(Number(item.at)-now);
      const date=document.createElement("div");date.className="tm-count-date";date.textContent=Number(item.at)?new Date(Number(item.at)).toLocaleString("zh-CN"):"";
      row.append(top,time,date);listEl.appendChild(row);
    }
  }
  function open(){overlay?.classList.add("open");render();}
  window.TaskMatrixPlugins.register({
    id:"countdown",
    async mount(api){
      apiRef=api;state=load(api);style();
      overlay=document.createElement("div");overlay.className="tm-count-ov";const box=document.createElement("section");box.className="tm-count";
      box.innerHTML=`<div class="tm-count-head"><h3>⏳ 倒计时</h3><button type="button">×</button></div><div class="tm-count-add"><input maxlength="40" placeholder="事件名称"><input type="datetime-local"><button type="button">添加</button></div><div class="tm-count-list"></div>`;
      overlay.appendChild(box);document.body.appendChild(overlay);listEl=box.querySelector(".tm-count-list");
      const title=box.querySelector('.tm-count-add input:not([type])'),dt=box.querySelector('input[type="datetime-local"]'),add=box.querySelector(".tm-count-add button");
      add.addEventListener("click",()=>{const at=new Date(dt.value).getTime();if(!title.value.trim()||!Number.isFinite(at)){api.host.toast("请填写事件名称和时间");return;}state.items.push({id:Date.now()+Math.random(),title:title.value.trim().slice(0,40),at});title.value="";dt.value="";save();render();});
      box.querySelector(".tm-count-head button").addEventListener("click",()=>overlay.classList.remove("open"));
      overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)overlay.classList.remove("open");});
      timer=setInterval(()=>{if(overlay?.classList.contains("open"))render();},1000);
      api.host.addLauncher({icon:"⏳",label:"倒计时",onClick:open});render();
      return()=>{clearInterval(timer);api.host.removeLauncher();overlay?.remove();overlay=null;document.getElementById("tm-count-style")?.remove();apiRef=null;};
    },
    open
  });
})();