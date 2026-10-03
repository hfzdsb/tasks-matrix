(() => {
  "use strict";
  let apiRef=null, overlay=null, listEl=null, state={notes:[]};

  function load(api){
    const s=api.storage.get({notes:[]});
    return {notes:Array.isArray(s?.notes)?s.notes.filter(x=>x&&typeof x.text==="string"):[]};
  }
  function save(){apiRef?.storage.set(state);}
  function style(){
    if(document.getElementById("tm-notes-style"))return;
    const s=document.createElement("style");s.id="tm-notes-style";s.textContent=`
      .tm-notes-ov{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}.tm-notes-ov.open{display:flex}
      .tm-notes{width:min(720px,96vw);max-height:88vh;overflow:auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;color:#fff;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.55);font-family:"Segoe UI","Microsoft YaHei",sans-serif}
      .tm-notes-head{display:flex;justify-content:space-between;align-items:center}.tm-notes-head h3{margin:0}.tm-notes-head button{border:0;background:transparent;color:#94a3b8;font-size:24px;cursor:pointer}
      .tm-notes-add{display:flex;gap:8px;margin:15px 0}.tm-notes-add textarea{flex:1;resize:vertical;min-height:72px;border:1px solid #334155;border-radius:10px;background:#0b1220;color:#fff;padding:10px}.tm-notes-add button{border:0;border-radius:10px;background:#4f46e5;color:#fff;padding:0 16px;cursor:pointer}
      .tm-notes-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.tm-note{background:rgba(30,41,59,.7);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px}.tm-note textarea{width:100%;min-height:120px;resize:vertical;border:0;outline:none;background:transparent;color:#e5e7eb;line-height:1.55}.tm-note-foot{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:10px;margin-top:6px}.tm-note-foot button{border:0;background:transparent;color:#f87171;cursor:pointer}
    `;document.head.appendChild(s);
  }
  function render(){
    if(!listEl)return; listEl.textContent="";
    const notes=[...state.notes].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!notes.length){const e=document.createElement("div");e.style.color="#94a3b8";e.style.padding="18px 0";e.textContent="还没有便签。";listEl.appendChild(e);return;}
    for(const n of notes){
      const card=document.createElement("article");card.className="tm-note";
      const ta=document.createElement("textarea");ta.value=n.text;
      let debounce=null;
      ta.addEventListener("input",()=>{
        clearTimeout(debounce);debounce=setTimeout(()=>{
          const t=state.notes.find(x=>x.id===n.id);if(!t)return;
          t.text=ta.value.slice(0,2000);t.updatedAt=Date.now();save();
        },400);
      });
      const foot=document.createElement("div");foot.className="tm-note-foot";
      const time=document.createElement("span");time.textContent=n.updatedAt?new Date(n.updatedAt).toLocaleString("zh-CN"):"";
      const del=document.createElement("button");del.type="button";del.textContent="删除";
      del.addEventListener("click",()=>{state.notes=state.notes.filter(x=>x.id!==n.id);save();render();});
      foot.append(time,del);card.append(ta,foot);listEl.appendChild(card);
    }
  }
  function open(){overlay?.classList.add("open");render();}
  window.TaskMatrixPlugins.register({
    id:"notes",
    async mount(api){
      apiRef=api;state=load(api);style();
      overlay=document.createElement("div");overlay.className="tm-notes-ov";
      const box=document.createElement("section");box.className="tm-notes";
      box.innerHTML=`<div class="tm-notes-head"><h3>📝 速记便签</h3><button type="button">×</button></div><div class="tm-notes-add"><textarea placeholder="随手记点什么…"></textarea><button type="button">添加</button></div><div class="tm-notes-grid"></div>`;
      overlay.appendChild(box);document.body.appendChild(overlay);listEl=box.querySelector(".tm-notes-grid");
      const input=box.querySelector(".tm-notes-add textarea"),add=box.querySelector(".tm-notes-add button");
      const create=()=>{const text=input.value.trim();if(!text)return;state.notes.push({id:Date.now()+Math.random(),text:text.slice(0,2000),updatedAt:Date.now()});input.value="";save();render();};
      add.addEventListener("click",create);input.addEventListener("keydown",e=>{if(e.ctrlKey&&e.key==="Enter")create();});
      box.querySelector(".tm-notes-head button").addEventListener("click",()=>overlay.classList.remove("open"));
      overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)overlay.classList.remove("open");});
      api.host.addLauncher({icon:"📝",label:"便签",onClick:open});render();
      return()=>{api.host.removeLauncher();overlay?.remove();overlay=null;document.getElementById("tm-notes-style")?.remove();apiRef=null;};
    },
    open
  });
})();