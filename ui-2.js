(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function createAmbient() {
    if (document.getElementById("ui2Ambient")) return;
    const root = document.createElement("div");
    root.id = "ui2Ambient";
    root.innerHTML = '<div class="ui2-grid"></div><div class="ui2-ribbon one"></div><div class="ui2-ribbon two"></div><div class="ui2-orb a"></div><div class="ui2-orb b"></div><div class="ui2-orb c"></div>';
    document.body.prepend(root);
  }

  function initPointerLight() {
    if (!finePointer) {
      window.TaskMatrixUI2 = Object.freeze({ setDragging() {} });
      return;
    }

    const setQuad = (x, y) => {
      const idx = (x >= innerWidth/2 ? 1 : 0) + (y >= innerHeight/2 ? 2 : 0);
      document.querySelectorAll(".q").forEach((q, i) => q.classList.toggle("cursor-near", i === idx));
    };

    window.addEventListener("pointermove", (e) => {
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
      setQuad(e.clientX, e.clientY);
    }, { passive: true });

    window.TaskMatrixUI2 = Object.freeze({ setDragging() {} });
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

      let draggingBox = null;
      stage.addEventListener("pointerdown", (e) => {
        const box = e.target.closest(".box");
        if (!box) return;
        draggingBox = box;
        box.classList.add("dragging");
        document.body.classList.add("is-dragging");
        window.TaskMatrixUI2?.setDragging?.(true);
      }, true);

      const clearDragVisual = () => {
        draggingBox?.classList.remove("dragging");
        draggingBox = null;
        document.body.classList.remove("is-dragging");
        window.TaskMatrixUI2?.setDragging?.(false);
      };
      window.addEventListener("pointerup", clearDragVisual, true);
      window.addEventListener("pointercancel", clearDragVisual, true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLife, {once:true});
  } else {
    initLife();
  }
})();