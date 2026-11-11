import { getStore } from "@netlify/blobs";
import { STORE_NAME } from "./config.mjs";
export const store = () => getStore({ name: STORE_NAME, consistency: "strong" });
export const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
export const clean = (v, n = 100) => String(v ?? "").trim().slice(0, n);
