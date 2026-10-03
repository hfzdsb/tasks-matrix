(() => {
  "use strict";
  let apiRef=null, overlay=null, timer=null, state=null, refs={};

  const defaults=()=>({focusMin:25,breakMin:5,mode:"focus",running:false,endsAt:null,remaining:1500,sessions:0});

  function load(api){
    const s=api.storage.get(null);
    const d=defaults();
    if(!s||typeof s!=="object") return d;
    return {
      focusMin:Math.max(1,Math.min(180,Number(s.focusMin)||25)),
      breakMin:Math.max(1,Math.min(60,Number(s.breakMin)||5)),
      mode:s.mode==="break"?"break":"focus",
      running:Boolean(s.running),
      endsAt:Number(s.endsAt)||null,
      remaining:Math.max(0,Number(s.remaining)||1500),
      sessions:Math.max(0,Number(s.sessions)||0)
    };
  }

  function save(){ apiRef?.storage.set(state); }
  function totalForMode(){ return (state.mode==="focus"?state.focusMin:state.breakMin)*60; }
  function remaining(){
    if(state.running&&state.endsAt) return Math.max(0,Math.ceil((state.endsAt-Date.now())/1000));
    return Math.max(0,state.remaining);
  }
  function fmt(sec){
    const m=Math.floor(sec/60), s=sec%60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }

  function injectStyle(){
    if(document.getElementById("tm-pomo-style")) return;
    const s=document.createElement("style"); s.id="tm-pomo-style";
    s.textContent=`
      .tm-pomo-ov{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}
      .tm-pomo-ov.open{display:flex}.tm-pomo{width:min(420px,92vw);background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:20px;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.55);font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-pomo-head{display:flex;justify-content:space-between;align-items:center}.tm-pomo-head h3{margin:0;font-size:19px}.tm-pomo-x{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-pomo-mode{text-align:center;color:#94a3b8;margin-top:18px;font-size:13px}.tm-pomo-time{text-align:center;font-size:62px;font-weight:800;letter-spacing:2px;margin:6px 0}
      .tm-pomo-sessions{text-align:center;color:#a7f3d0;font-size:12px}.tm-pomo-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:18px}.tm-pomo-actions button,.tm-pomo-settings button{border:0;border-radius:10px;padding:10px;color:#fff;cursor:pointer;background:#334155}.tm-pomo-actions .main{background:linear-gradient(135deg,#dc2626,#f97316)}
      .tm-pomo-settings{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.tm-pomo-settings label{font-size:11px;color:#94a3b8}.tm-pomo-settings input{width:100%;margin-top:4px;border:1px solid #334155;border-radius:8px;background:#0b1220;color:#fff;padding:8px}
    `;
    document.head.appendChild(s);
  }

  function render(){
    if(!overlay) return;
    const r=remaining();
    refs.mode.textContent=state.mode==="focus"?"专注阶段":"休息阶段";
    refs.time.textContent=fmt(r);
    refs.start.textContent=state.running?"暂停":"开始";
    refs.sessions.textContent="已完成专注 "+state.sessions+" 次";
  }

  function complete(){
    state.running=false; state.endsAt=null; state.remaining=0;
    if(state.mode==="focus"){
      state.sessions++;
      apiRef.host.toast("本轮专注完成，休息一下吧");
      state.mode="break";
    }else{
      apiRef.host.toast("休息结束，可以开始下一轮专注");
      state.mode="focus";
    }
    state.remaining=totalForMode();
    save(); render();
  }

  function tick(){
    if(!state.running) return;
    if(remaining()<=0) complete();
    else render();
  }

  function toggle(){
    if(state.running){
      state.remaining=remaining();
      state.running=false; state.endsAt=null;
    }else{
      if(remaining()<=0) state.remaining=totalForMode();
      state.endsAt=Date.now()+state.remaining*1000;
      state.running=true;
    }
    save(); render();
  }

  function reset(){
    state.running=false; state.endsAt=null; state.remaining=totalForMode();
    save(); render();
  }

  function skip(){
    state.running=false; state.endsAt=null;
    state.mode=state.mode==="focus"?"break":"focus";
    state.remaining=totalForMode();
    save(); render();
  }

  function open(){ overlay?.classList.add("open"); render(); }

  window.TaskMatrixPlugins.register({
    id:"pomodoro",
    async mount(api){
      apiRef=api; state=load(api); injectStyle();

      overlay=document.createElement("div"); overlay.className="tm-pomo-ov";
      const box=document.createElement("section"); box.className="tm-pomo";
      box.innerHTML=`
        <div class="tm-pomo-head"><h3>🍅 番茄钟</h3><button class="tm-pomo-x" type="button">×</button></div>
        <div class="tm-pomo-mode"></div>
        <div class="tm-pomo-time">25:00</div>
        <div class="tm-pomo-sessions"></div>
        <div class="tm-pomo-actions">
          <button class="main" data-a="toggle">开始</button>
          <button data-a="reset">重置</button>
          <button data-a="skip">切换阶段</button>
        </div>
        <div class="tm-pomo-settings">
          <label>专注分钟<input data-k="focusMin" type="number" min="1" max="180"></label>
          <label>休息分钟<input data-k="breakMin" type="number" min="1" max="60"></label>
          <button data-a="apply">应用</button>
        </div>`;
      overlay.appendChild(box); document.body.appendChild(overlay);
      refs={
        mode:box.querySelector(".tm-pomo-mode"),
        time:box.querySelector(".tm-pomo-time"),
        sessions:box.querySelector(".tm-pomo-sessions"),
        start:box.querySelector('[data-a="toggle"]'),
        focus:box.querySelector('[data-k="focusMin"]'),
        break:box.querySelector('[data-k="breakMin"]')
      };
      refs.focus.value=state.focusMin; refs.break.value=state.breakMin;
      box.querySelector(".tm-pomo-x").addEventListener("click",()=>overlay.classList.remove("open"));
      overlay.addEventListener("pointerdown",e=>{if(e.target===overlay) overlay.classList.remove("open");});
      box.querySelector('[data-a="toggle"]').addEventListener("click",toggle);
      box.querySelector('[data-a="reset"]').addEventListener("click",reset);
      box.querySelector('[data-a="skip"]').addEventListener("click",skip);
      box.querySelector('[data-a="apply"]').addEventListener("click",()=>{
        state.focusMin=Math.max(1,Math.min(180,Number(refs.focus.value)||25));
        state.breakMin=Math.max(1,Math.min(60,Number(refs.break.value)||5));
        state.running=false; state.endsAt=null; state.remaining=totalForMode();
        save(); render();
      });

      if(state.running&&remaining()<=0) complete();
      timer=setInterval(tick,1000);
      api.host.addLauncher({icon:"🍅",label:"番茄钟",onClick:open});
      render();

      return ()=>{
        clearInterval(timer); timer=null;
        api.host.removeLauncher();
        overlay?.remove(); overlay=null;
        document.getElementById("tm-pomo-style")?.remove();
        apiRef=null;
      };
    },
    open
  });
})();