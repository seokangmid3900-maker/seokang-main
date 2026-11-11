// 학부모용 분석 리포트 (공유 링크 토큰으로만 열림 — 관리자 정보 없음)
import { store, json, clean } from "../lib/db.mjs";
import { DEFAULT_TEST, analyze } from "../lib/grading.mjs";

export default async (req) => {
  const t = clean(new URL(req.url).searchParams.get("t"), 40);
  if (!t) return json({ ok: false }, 400);
  const st = store();
  const id = await st.get(`tok/${t}`);
  if (!id) return json({ ok: false, message: "리포트를 찾을 수 없습니다." }, 404);
  const [app, sc, test] = await Promise.all([st.get(`app/${id}`, { type: "json" }), st.get(`score/${id}`, { type: "json" }), st.get("test/config", { type: "json" })]);
  if (!app || !sc || sc.absent) return json({ ok: false, message: "리포트가 아직 준비되지 않았습니다." }, 404);
  const T = test || DEFAULT_TEST;
  const r = analyze(T, sc.wrong);
  return json({ ok: true, title: T.title, student: { name: app.studentName, school: app.school, grade: app.grade },
    date: app.when, result: { ...r, units: r.units.map(({ wrong, ...u }) => u) }, course: sc.course || r.course, comment: sc.comment || "" });
};

export const config = { path: "/api/report" };
