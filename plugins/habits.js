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

  function injectStyle(){ return null; }

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