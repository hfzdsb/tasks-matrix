(() => {
  "use strict";

  let apiRef=null, overlay=null, events=[], timer=null;

  function normalize(raw){
    const list=Array.isArray(raw?.events)?raw.events:[];
    return list.map(e=>({
      id:e?.id ?? (Date.now()+Math.random()),
      title:String(e?.title||"").slice(0,80),
      target:Number(e?.target)||0
    })).filter(e=>e.title && e.target>0);
  }
  function save(){ apiRef?.storage.set({events}); }

  function injectStyle(){ return null; }

  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(text!=null) el.textContent=text;
    return el;
  }

  function formatLeft(target){
    let sec=Math.floor((target-Date.now())/1000);
    if(sec<=0) return "已到时间";
    const d=Math.floor(sec/86400); sec%=86400;
    const h=Math.floor(sec/3600); sec%=3600;
    const m=Math.floor(sec/60); const s=sec%60;
    if(d>0) return d+"天 "+h+"时 "+m+"分";
    if(h>0) return h+"时 "+m+"分 "+s+"秒";
    return m+"分 "+s+"秒";
  }

  function render(){
    if(!overlay) return;
    const list=overlay.querySelector("[data-count-list]");
    list.textContent="";
    if(!events.length){
      list.appendChild(make("div","tm-count-empty","还没有倒计时。可以添加考试、截止日期、旅行或纪念日。"));
      return;
    }
    [...events].sort((a,b)=>a.target-b.target).forEach(ev=>{
      const row=make("div","tm-count-row");
      const info=make("div");
      info.append(make("div","tm-count-title",ev.title),make("div","tm-count-target",new Date(ev.target).toLocaleString("zh-CN")));
      const left=make("div","tm-count-left"+(ev.target<=Date.now()?" done":""),formatLeft(ev.target));
      left.dataset.target=String(ev.target);
      const del=make("button","tm-count-del","×");
      del.type="button";
      del.title="删除倒计时";
      del.addEventListener("click",()=>{
        events=events.filter(x=>x.id!==ev.id);
        save(); render();
      });
      row.append(info,left,del);
      list.appendChild(row);
    });
  }

  function tick(){
    if(!overlay?.classList.contains("open")) return;
    overlay.querySelectorAll(".tm-count-left[data-target]").forEach(el=>{
      const target=Number(el.dataset.target);
      el.textContent=formatLeft(target);
      el.classList.toggle("done",target<=Date.now());
    });
  }

  function build(){
    overlay=make("div","tm-count-overlay");
    const card=make("section","tm-count-card");
    const head=make("div","tm-count-head");
    const intro=make("div");
    intro.append(make("h2","", "倒计时"),make("p","", "把重要日期放到眼前，减少遗忘。"));
    const close=make("button","tm-count-x","×");
    close.type="button";
    close.addEventListener("click",()=>overlay.classList.remove("open"));
    head.append(intro,close);

    const add=make("div","tm-count-add");
    const title=document.createElement("input");
    title.maxLength=80; title.placeholder="事件名称";
    const dt=document.createElement("input");
    dt.type="datetime-local";
    const addBtn=make("button","", "添加");
    addBtn.type="button";
    const submit=()=>{
      const name=title.value.trim();
      const target=new Date(dt.value).getTime();
      if(!name){ title.focus(); return; }
      if(!Number.isFinite(target) || target<=Date.now()){
        apiRef?.host.toast("请选择未来的时间");
        dt.focus(); return;
      }
      events.push({id:Date.now()+Math.random(),title:name,target});
      title.value=""; dt.value="";
      save(); render();
    };
    addBtn.addEventListener("click",submit);
    add.append(title,dt,addBtn);

    const list=make("div","tm-count-list"); list.dataset.countList="";
    card.append(head,add,list);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown",(e)=>{if(e.target===overlay) overlay.classList.remove("open");});
    document.body.appendChild(overlay);
  }

  function open(){ overlay?.classList.add("open"); render(); }

  window.TaskMatrixPlugins.register({
    id:"countdown",
    async mount(api){
      apiRef=api;
      events=normalize(api.storage.get({events:[]}));
      injectStyle(); build();
      api.host.addLauncher({icon:"⏳",label:"倒计时",title:"打开倒计时",onClick:open});
      timer=setInterval(tick,1000);
      return ()=>{
        clearInterval(timer); timer=null;
        api.host.removeLauncher();
        overlay?.remove(); overlay=null;
        document.getElementById("tm-countdown-style")?.remove();
        apiRef=null;
      };
    },
    open
  });
})();