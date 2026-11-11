// 반배치고사 채점 API (관리자 비밀번호 필요)
import crypto from "node:crypto";
import { DEFAULT_ADMIN_PASSWORD } from "../lib/config.mjs";
import { store, json, clean } from "../lib/db.mjs";
import { DEFAULT_TEST, analyze } from "../lib/grading.mjs";

const getTest = async st => (await st.get("test/config", { type: "json" })) || DEFAULT_TEST;

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  let d; try { d = await req.json(); } catch { return json({ ok: false }, 400); }
  if (d.password !== (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD)) return json({ ok: false, message: "비밀번호가 맞지 않습니다." }, 401);
  const st = store();

  if (d.action === "saveConfig") {
    const t = d.test || {};
    const questions = (t.questions || []).map((q, i) => ({ no: i + 1, unit: clean(q.unit, 40) || "미분류", pts: Math.max(0, Number(q.pts) || 0) })).slice(0, 80);
    if (!questions.length) return json({ ok: false, message: "문항을 1개 이상 넣어 주세요." }, 400);
    const cut = { strong: +t.cut?.strong || 85, weak: +t.cut?.weak || 60, sunpul: +t.cut?.sunpul || 85, hinpul: +t.cut?.hinpul || 60 };
    await st.setJSON("test/config", { title: clean(t.title, 60) || DEFAULT_TEST.title, questions, cut });
  }
  if (d.action === "save") {
    const id = clean(d.id, 40);
    const app = await st.get(`app/${id}`, { type: "json" });
    if (!app) return json({ ok: false, message: "학생을 찾을 수 없습니다." }, 404);
    const prev = (await st.get(`score/${id}`, { type: "json" })) || {};
    const rec = { ...prev, id, wrong: (d.wrong || []).map(Number).filter(n => n > 0), absent: d.absent === true,
      comment: clean(d.comment, 600), course: clean(d.course, 30), by: clean(d.by, 20), at: new Date().toISOString() };
    if (!rec.token) rec.token = crypto.randomBytes(9).toString("base64url");
    await st.setJSON(`score/${id}`, rec);
    await st.set(`tok/${rec.token}`, id);
  }
  const test = await getTest(st);
  const { blobs } = await st.list({ prefix: "app/" });
  const apps = (await Promise.all(blobs.map(b => st.get(b.key, { type: "json" })))).filter(a => a && a.type === "추가 반배치");
  const rows = await Promise.all(apps.map(async a => {
    const sc = await st.get(`score/${a.id}`, { type: "json" });
    return { id: a.id, studentName: a.studentName, school: a.school, slot: a.slot, parentPhone: a.parentPhone, status: a.status,
      score: sc ? { ...sc, result: sc.absent ? null : analyze(test, sc.wrong) } : null };
  }));
  rows.sort((x, y) => (x.slot || "").localeCompare(y.slot || "") || x.studentName.localeCompare(y.studentName, "ko"));
  return json({ ok: true, test, rows });
};

export const config = { path: "/api/grade" };
