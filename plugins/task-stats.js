(() => {
  "use strict";
  let apiRef=null,overlay=null,body=null;
  const names=["重要且紧急","重要不紧急","不重要但紧急","不重要且不紧急"];
  const icons=["🔥","🌱","⚡","🫧"];

  function style(){
    if(document.getElementById("tm-stats-style"))return;
    const s=document.createElement("style");s.id="tm-stats-style";s.textContent=`
      .tm-stats-ov{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}.tm-stats-ov.open{display:flex}
      .tm-stats{width:min(600px,94vw);background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:18px;color:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.tm-stats-head{display:flex;justify-content:space-between;align-items:center}.tm-stats-head h3{margin:0}.tm-stats-head button{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-stats-total{font-size:13px;color:#94a3b8;margin:12px 0}.tm-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tm-stat-card{border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(30,41,59,.6);padding:13px}.tm-stat-n{font-size:28px;font-weight:800}.tm-stat-name{font-size:12px;color:#cbd5e1;margin-top:3px}.tm-stat-list{font-size:11px;color:#94a3b8;line-height:1.55;margin-top:7px;max-height:70px;overflow:auto}.tm-stats-refresh{width:100%;margin-top:12px;border:0;border-radius:10px;background:#334155;color:#fff;padding:9px;cursor:pointer}
    `;document.head.appendChild(s);
  }
  function quadrant(t){
    const x=Number(t.nx),y=Number(t.ny);
    if(!Number.isFinite(x)||!Number.isFinite(y))return 3;
    return (y<.5?0:2)+(x<.5?0:1);
  }
  function render(){
    if(!body)return;
    const tasks=apiRef?.host.getTasks?.()||[],groups=[[],[],[],[]];
    for(const t of tasks)groups[quadrant(t)].push(t);
    body.textContent="";
    const total=document.createElement("div");total.className="tm-stats-total";total.textContent="当前共有 "+tasks.length+" 个任务";body.appendChild(total);
    const grid=document.createElement("div");grid.className="tm-stats-grid";
    groups.forEach((g,i)=>{
      const card=document.createElement("article");card.className="tm-stat-card";
      const n=document.createElement("div");n.className="tm-stat-n";n.textContent=icons[i]+" "+g.length;
      const name=document.createElement("div");name.className="tm-stat-name";name.textContent=names[i];
      const list=document.createElement("div");list.className="tm-stat-list";list.textContent=g.length?g.slice(0,5).map(x=>"• "+(x.t||"未命名")).join("\n"):"暂无任务";
      list.style.whiteSpace="pre-line";card.append(n,name,list);grid.appendChild(card);
    });
    body.appendChild(grid);
  }
  function open(){overlay?.classList.add("open");render();}
  window.TaskMatrixPlugins.register({
    id:"task-stats",
    async mount(api){
      apiRef=api;style();overlay=document.createElement("div");overlay.className="tm-stats-ov";
      const box=document.createElement("section");box.className="tm-stats";box.innerHTML=`<div class="tm-stats-head"><h3>📊 任务统计</h3><button type="button">×</button></div><div class="tm-stats-body"></div><button class="tm-stats-refresh" type="button">刷新统计</button>`;
      overlay.appendChild(box);document.body.appendChild(overlay);body=box.querySelector(".tm-stats-body");
      box.querySelector(".tm-stats-head button").addEventListener("click",()=>overlay.classList.remove("open"));
      box.querySelector(".tm-stats-refresh").addEventListener("click",render);
      overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)overlay.classList.remove("open");});
      api.host.addLauncher({icon:"📊",label:"统计",onClick:open});render();
      return()=>{api.host.removeLauncher();overlay?.remove();overlay=null;document.getElementById("tm-stats-style")?.remove();apiRef=null;};
    },
    open
  });
})();