(() => {
  "use strict";

  let apiRef=null, overlay=null;

  const META=[
    {name:"重要且紧急",tip:"立即处理",icon:"🔥"},
    {name:"重要不紧急",tip:"安排时间",icon:"🌱"},
    {name:"不重要但紧急",tip:"考虑委托",icon:"⚡"},
    {name:"不重要且不紧急",tip:"减少投入",icon:"🫧"}
  ];

  function injectStyle(){
    if(document.getElementById("tm-insights-style")) return;
    const s=document.createElement("style");
    s.id="tm-insights-style";
    s.textContent=`
      .tm-insight-overlay{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.74);backdrop-filter:blur(5px)}
      .tm-insight-overlay.open{display:flex}.tm-insight-card{width:min(720px,96vw);max-height:86vh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#111827;color:#fff;box-shadow:0 26px 80px rgba(0,0,0,.55);font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-insight-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.tm-insight-head h2{margin:0;font-size:19px}.tm-insight-head p{margin:4px 0 0;color:#94a3b8;font-size:12px}.tm-insight-x{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-insight-total{padding:18px 18px 4px;color:#cbd5e1;font-size:13px}.tm-insight-total b{font-size:28px;color:#fff;margin-right:6px}
      .tm-insight-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px 18px}.tm-insight-box{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(30,41,59,.62)}
      .tm-insight-top{display:flex;justify-content:space-between;gap:10px}.tm-insight-name{font-size:13px;font-weight:700}.tm-insight-count{font-size:22px;font-weight:800}.tm-insight-tip{font-size:11px;color:#94a3b8;margin-top:5px}.tm-insight-bar{height:6px;border-radius:999px;background:#1f2937;margin-top:10px;overflow:hidden}.tm-insight-bar>div{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6)}
      .tm-insight-next{margin:6px 18px 18px;padding:14px;border:1px solid rgba(129,140,248,.28);border-radius:15px;background:rgba(79,70,229,.09)}.tm-insight-next h3{margin:0 0 7px;font-size:13px}.tm-insight-task{font-size:16px;font-weight:700;line-height:1.45}.tm-insight-muted{font-size:12px;color:#94a3b8}.tm-insight-pick{margin-top:10px;border:0;border-radius:10px;background:#4f46e5;color:#fff;padding:8px 12px;cursor:pointer}
      @media(max-width:560px){.tm-insight-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(text!=null) el.textContent=text;
    return el;
  }

  function splitTasks(){
    const tasks=apiRef?.host.getTasks?.() || [];
    const groups=[[],[],[],[]];
    for(const t of tasks){
      const x=Number(t?.nx), y=Number(t?.ny);
      const right=Number.isFinite(x) ? x>=0.5 : false;
      const bottom=Number.isFinite(y) ? y>=0.5 : false;
      const q=bottom ? (right?3:2) : (right?1:0);
      groups[q].push(t);
    }
    return {tasks,groups};
  }

  function render(){
    if(!overlay) return;
    const content=overlay.querySelector("[data-insight-content]");
    content.textContent="";
    const {tasks,groups}=splitTasks();
    const total=tasks.length;

    const totalEl=make("div","tm-insight-total");
    totalEl.append(make("b","",String(total)),document.createTextNode(" 个当前任务"));
    content.appendChild(totalEl);

    const grid=make("div","tm-insight-grid");
    groups.forEach((items,i)=>{
      const box=make("div","tm-insight-box");
      const top=make("div","tm-insight-top");
      top.append(make("div","tm-insight-name",META[i].icon+" "+META[i].name),make("div","tm-insight-count",String(items.length)));
      box.append(top,make("div","tm-insight-tip",META[i].tip));
      const bar=make("div","tm-insight-bar");
      const fill=document.createElement("div");
      fill.style.width=(total?Math.round(items.length/total*100):0)+"%";
      bar.appendChild(fill);
      box.appendChild(bar);
      grid.appendChild(box);
    });
    content.appendChild(grid);

    const focus=groups[0].length?groups[0]:groups[1].length?groups[1]:tasks;
    const next=make("div","tm-insight-next");
    next.appendChild(make("h3","", "下一项建议"));
    const taskEl=make("div","tm-insight-task");
    const muted=make("div","tm-insight-muted");
    const pick=make("button","tm-insight-pick","换一个");

    const choose=()=>{
      if(!focus.length){
        taskEl.textContent="目前没有任务";
        muted.textContent="可以先添加一项真正需要处理的事情。";
        pick.style.display="none";
        return;
      }
      const t=focus[Math.floor(Math.random()*focus.length)];
      taskEl.textContent=t?.t || "未命名任务";
      muted.textContent=groups[0].includes(t)?"来自「重要且紧急」":groups[1].includes(t)?"来自「重要不紧急」":"从当前任务中随机选择";
      pick.style.display=focus.length>1?"inline-block":"none";
    };
    pick.addEventListener("click",choose);
    choose();
    next.append(taskEl,muted,pick);
    content.appendChild(next);
  }

  function build(){
    overlay=make("div","tm-insight-overlay");
    const card=make("section","tm-insight-card");
    const head=make("div","tm-insight-head");
    const intro=make("div");
    intro.append(make("h2","", "四象限统计"),make("p","", "查看当前任务分布，并从重要任务里挑一个下一步。"));
    const close=make("button","tm-insight-x","×");
    close.type="button";
    close.addEventListener("click",()=>overlay.classList.remove("open"));
    head.append(intro,close);
    const content=make("div"); content.dataset.insightContent="";
    card.append(head,content);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown",(e)=>{if(e.target===overlay) overlay.classList.remove("open");});
    document.body.appendChild(overlay);
  }

  function open(){ overlay?.classList.add("open"); render(); }

  window.TaskMatrixPlugins.register({
    id:"quadrant-insights",
    async mount(api){
      apiRef=api;
      injectStyle(); build();
      api.host.addLauncher({icon:"📊",label:"统计",title:"打开四象限统计",onClick:open});
      return ()=>{
        api.host.removeLauncher();
        overlay?.remove(); overlay=null;
        document.getElementById("tm-insights-style")?.remove();
        apiRef=null;
      };
    },
    open
  });
})();