// 상담 신청 접수 API (POST)
import { store, json, clean } from "../lib/db.mjs";
import { sendSms, adminPhones, adminNotice } from "../lib/sms.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, message: "허용되지 않은 요청" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ ok: false, message: "잘못된 요청" }, 400); }
  if (d.website) return json({ ok: true, id: "x" }); // 스팸 차단용 숨은 칸

  const app = {
    studentName: clean(d.studentName, 30), school: clean(d.school, 40), grade: clean(d.grade, 20),
    member: clean(d.member, 20), parentName: clean(d.parentName, 30), parentPhone: clean(d.parentPhone, 20),
    days: clean(d.days, 20), method: clean(d.method, 20), when: clean(d.when, 40),
    study: clean(d.study, 30), progress: clean(d.progress, 60), memo: clean(d.memo, 1000),
    source: clean(d.source, 30),
  };
  // 본관: 상담 목적 · 반배치 응시 여부를 함께 기록
  const purpose = clean(d.purpose, 20), tested = clean(d.tested, 20);
  if (purpose) app.method = `${purpose} · ${app.method}`;
  if (tested) app.member = `${app.member} · 반배치 ${tested}`;
  if (!app.studentName || !app.school || !app.grade || !app.member || !app.method)
    return json({ ok: false, message: "필수 항목을 모두 입력해 주세요." }, 400);
  if (!/^01\d-\d{3,4}-\d{4}$/.test(app.parentPhone)) return json({ ok: false, message: "학부모 연락처를 확인해 주세요." }, 400);
  if (d.agree !== true) return json({ ok: false, message: "개인정보 수집·이용에 동의해 주세요." }, 400);

  const st = store();
  const id = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 7);
  const rec = { id, createdAt: new Date().toISOString(), ...app, status: "접수", adminMemo: "", sms: [] };
  await st.setJSON(`app/${id}`, rec);

  // 관리자에게 신청 알림 문자 (실패해도 신청은 접수됨)
  const site = process.env.URL || new URL(req.url).origin;
  const phones = adminPhones();
  if (phones.length) {
    const r = await sendSms(phones, adminNotice(app, site));
    rec.adminAlert = { at: new Date().toISOString(), ok: r.ok, reason: r.reason || "" };
    await st.setJSON(`app/${id}`, rec);
  }
  return json({ ok: true, id });
};

export const config = { path: "/api/apply" };
