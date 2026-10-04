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

    const ring = document.createElement("div");
    const glow = document.createElement("div");
    ring.className = "ui-cursor-ring is-hidden";
    glow.className = "ui-cursor-glow is-hidden";
    document.body.append(glow, ring);

    let targetX = innerWidth / 2;
    let targetY = innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let glowX = targetX;
    let glowY = targetY;
    let raf = 0;
    let dragging = false;

    const setAccent = (value) => {
      const accent = value || "129,140,248";
      ring.style.setProperty("--cursor-accent", accent);
      glow.style.setProperty("--cursor-accent", accent);
    };

    const accentFromTask = (task) => {
      if (!task) return null;
      const raw = getComputedStyle(task).getPropertyValue("--task-color").trim();
      const hex = raw.match(/^#([0-9a-f]{6})$/i);
      if (!hex) return null;
      const n = parseInt(hex[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
    };

    const paint = () => {
      raf = 0;
      const ringEase = reduced ? 1 : .26;
      const glowEase = reduced ? 1 : .12;
      ringX += (targetX - ringX) * ringEase;
      ringY += (targetY - ringY) * ringEase;
      glowX += (targetX - glowX) * glowEase;
      glowY += (targetY - glowY) * glowEase;

      ring.style.transform = "translate3d(" + ringX.toFixed(2) + "px," + ringY.toFixed(2) + "px,0)";
      glow.style.transform = "translate3d(" + glowX.toFixed(2) + "px," + glowY.toFixed(2) + "px,0)";

      if (
        Math.abs(targetX - ringX) > .12 ||
        Math.abs(targetY - ringY) > .12 ||
        Math.abs(targetX - glowX) > .12 ||
        Math.abs(targetY - glowY) > .12
      ) {
        raf = requestAnimationFrame(paint);
      }
    };

    const ensurePaint = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const setQuad = (x, y) => {
      const idx = (x >= innerWidth/2 ? 1 : 0) + (y >= innerHeight/2 ? 2 : 0);
      document.querySelectorAll(".q").forEach((q, i) => q.classList.toggle("cursor-near", i === idx));
    };

    const updateState = (target) => {
      const task = target?.closest?.(".box") || null;
      const text = target?.closest?.("input,textarea,[contenteditable='true']") || null;
      const danger = target?.closest?.(
        ".auth-logout,.tm-uninstall,.tm-note-del,.tm-habit-del,.tm-count-del,.tm-sch-del,.tm-check-del,.tm-goal-del,.tm-ledger-del,.tm-ledger-clear,.trash"
      ) || null;
      const interactive = target?.closest?.(
        "button,a,.sw,[role='button'],.tm-plugin-card,.tm-plugin-launcher"
      ) || null;

      ring.classList.toggle("is-task", Boolean(task));
      ring.classList.toggle("is-text", Boolean(text));
      ring.classList.toggle("is-danger", Boolean(danger));
      ring.classList.toggle("is-interactive", Boolean(interactive) && !task && !text);
      glow.classList.toggle("is-text", Boolean(text));
      glow.classList.toggle("is-danger", Boolean(danger));
      glow.classList.toggle("is-interactive", Boolean(interactive) && !text);

      if (danger) setAccent("248,113,113");
      else if (task) setAccent(accentFromTask(task));
      else setAccent("129,140,248");
    };

    window.addEventListener("pointermove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      ring.classList.remove("is-hidden");
      glow.classList.remove("is-hidden");
      document.body.classList.add("ui-pointer-fx");

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

      updateState(e.target);
      setQuad(e.clientX, e.clientY);
      ensurePaint();
    }, { passive: true });

    document.addEventListener("pointerover", (e) => updateState(e.target), true);
    document.addEventListener("pointerdown", () => ring.classList.add("is-pressed"), true);
    document.addEventListener("pointerup", () => ring.classList.remove("is-pressed"), true);
    document.addEventListener("pointercancel", () => ring.classList.remove("is-pressed"), true);

    document.addEventListener("mouseleave", () => {
      ring.classList.add("is-hidden");
      glow.classList.add("is-hidden");
    });

    window.addEventListener("blur", () => {
      ring.classList.add("is-hidden");
      glow.classList.add("is-hidden");
    });

    window.TaskMatrixUI2 = Object.freeze({
      setDragging(value) {
        dragging = Boolean(value);
        ring.classList.toggle("is-dragging", dragging);
        glow.classList.toggle("is-dragging", dragging);
        ring.classList.remove("is-pressed");
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