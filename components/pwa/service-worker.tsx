"use client";

import { useEffect } from "react";

/** Registers the service worker and reloads once when a new worker takes over. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          // pull updates in promptly
          reg.update().catch(() => {});
          if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        })
        .catch(() => {
          /* registration failures are non-fatal */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
