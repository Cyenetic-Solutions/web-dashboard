"use client";

import { useEffect } from "react";

const interactive = "a, button, input, select, textarea, label, summary, [role='button'], .svc-head, .sect-row, .step, .rep, .mod-cell";

/** Reproduces the template ring/dot cursor, including native-dialog layering. */
export default function CustomCursor() {
  useEffect(() => {
    const preference = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const root = document.documentElement;
    const cursor = document.createElement("div");
    cursor.className = "cye-cursor";
    cursor.setAttribute("aria-hidden", "true");
    const ring = document.createElement("span");
    ring.className = "cye-cursor-ring";
    const dot = document.createElement("span");
    dot.className = "cye-cursor-dot";
    cursor.append(ring, dot);
    document.body.append(cursor);

    let x = 0, y = 0, dx = 0, dy = 0, rx = 0, ry = 0;
    let visible = false;
    let frame = 0;

    function animate() {
      dx += (x - dx) * 0.55;
      dy += (y - dy) * 0.55;
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      frame = window.requestAnimationFrame(animate);
    }

    function hide() {
      visible = false;
      root.classList.remove("cye-cursor-enabled");
      cursor.classList.remove("is-visible", "is-active", "is-down");
      window.cancelAnimationFrame(frame);
    }

    function hover(target: EventTarget | null) {
      cursor.classList.toggle("is-active", target instanceof Element && !!target.closest(interactive));
    }

    function move(event: PointerEvent) {
      if (!preference.matches || event.pointerType !== "mouse") { hide(); return; }
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        dx = rx = x;
        dy = ry = y;
        visible = true;
        root.classList.add("cye-cursor-enabled");
        cursor.classList.add("is-visible");
        animate();
      }
      hover(event.target);
    }

    function press(event: PointerEvent) {
      if (event.pointerType !== "mouse") { hide(); return; }
      if (visible) cursor.classList.add("is-down");
    }
    function release() { cursor.classList.remove("is-down"); }
    function leave(event: PointerEvent) { if (event.relatedTarget === null) hide(); }
    function visibility() { if (document.hidden) hide(); }
    function preferenceChange() { hide(); }

    // A modal lives above ordinary z-index layers; its cursor must share that layer.
    function syncLayer() {
      const dialogs = Array.from(document.querySelectorAll("dialog[open]"));
      const modal = dialogs.reverse().find((dialog) => dialog.matches(":modal"));
      const parent = modal ?? document.body;
      if (cursor.parentElement !== parent) parent.append(cursor);
      if (visible) hover(document.elementFromPoint(x, y));
    }
    const observer = new MutationObserver(syncLayer);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    syncLayer();
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerdown", press);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", hide);
    document.addEventListener("pointerout", leave);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", hide);
    preference.addEventListener("change", preferenceChange);

    return () => {
      observer.disconnect();
      hide();
      cursor.remove();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", hide);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", hide);
      preference.removeEventListener("change", preferenceChange);
    };
  }, []);

  return null;
}
