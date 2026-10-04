(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function createAmbient() {
    if (document.getElementById("ui2Ambient")) return;
    const root = document.createElement("div");
    root.id = "ui2Ambient";
    root.innerHTML = '<div class="ui2-grid"></div><div class="ui2-orb a"></div><div class="ui2-orb b"></div><div class="ui2-orb c"></div>';
    document.body.prepend(root);
  }

  function initPointerLight() {
    if (!finePointer) return;

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "ui2-cursor-dot";
    ring.className = "ui2-cursor-ring";
    document.body.append(dot, ring);
    document.body.classList.add("ui2-cursor-on");

    let tx = innerWidth / 2, ty = innerHeight / 2;
    let rx = tx, ry = ty;
    let raf = 0;

    const draw = () => {
      raf = 0;
      rx += (tx - rx) * .20;
      ry += (ty - ry) * .20;
      dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      if (Math.abs(tx-rx) > .2 || Math.abs(ty-ry) > .2) raf = requestAnimationFrame(draw);
    };

    const setQuad = (x, y) => {
      const idx = (x >= innerWidth/2 ? 1 : 0) + (y >= innerHeight/2 ? 2 : 0);
      document.querySelectorAll(".q").forEach((q, i) => q.classList.toggle("cursor-near", i === idx));
    };

    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      const px = ((e.clientX / Math.max(1, innerWidth)) * 100).toFixed(2) + "%";
      const py = ((e.clientY / Math.max(1, innerHeight)) * 100).toFixed(2) + "%";
      const dx = ((e.clientX / Math.max(1, innerWidth)) - .5) * -12;
      const dy = ((e.clientY / Math.max(1, innerHeight)) - .5) * -12;
      document.documentElement.style.setProperty("--ui-mx", px);
      document.documentElement.style.setProperty("--ui-my", py);
      if (!reduced) {
        document.documentElement.style.setProperty("--ui-px", dx.toFixed(2) + "px");
        document.documentElement.style.setProperty("--ui-py", dy.toFixed(2) + "px");
      }
      setQuad(e.clientX,e.clientY);
      if (!raf) raf = requestAnimationFrame(draw);
    }, {passive:true});

    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest?.("button,a,.box,.sw,[role='button']");
      const textInput = e.target.closest?.("input,textarea,select");
      ring.classList.toggle("hot", Boolean(el));
      ring.classList.toggle("hide", Boolean(textInput));
      ring.classList.toggle("danger", Boolean(e.target.closest?.(".auth-logout,.tm-uninstall,.tm-check-del,.tm-goal-del,.tm-ledger-del,.tm-ledger-clear,.trash")));
    });

    document.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget) {
        dot.style.opacity = "0";
        ring.style.opacity = "0";
      }
    });

    window.addEventListener("pointerenter", () => {
      dot.style.opacity = "";
      ring.style.opacity = "";
    });

    window.addEventListener("blur", () => document.body.classList.remove("ui2-cursor-on"));
    window.addEventListener("focus", () => document.body.classList.add("ui2-cursor-on"));

    window.TaskMatrixUI2 = Object.freeze({
      setDragging(value) {
        ring.classList.toggle("drag", Boolean(value));
      }
    });
  }

  function initLife() {
    createAmbient();
    initPointerLight();

    // Make newly-created task cards participate in the visual system.
    const stage = document.getElementById("stage");
    if (stage) {
      const syncTaskVars = () => {
        stage.querySelectorAll(".box").forEach((box) => {
          const bg = box.style.background || "";
          const match = bg.match(/#[0-9a-fA-F]{6}/);
          if (match) box.style.setProperty("--task-color", match[0]);
        });
      };
      syncTaskVars();
      new MutationObserver(syncTaskVars).observe(stage, {childList:true});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLife, {once:true});
  } else {
    initLife();
  }
})();