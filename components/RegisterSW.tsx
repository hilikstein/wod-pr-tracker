"use client";
import { useEffect } from "react";
import { BASE } from "./api";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch((e) => console.error("service worker registration failed", e));
    }
  }, []);
  return null;
}
