// 관리자 API — list / update / delete
import { DEFAULT_ADMIN_PASSWORD, STATUSES } from "../lib/config.mjs";
import { store, json, clean } from "../lib/db.mjs";
import { sendSms, smsReady, adminPhones } from "../lib/sms.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ ok: false }, 400); }
  if (d.password !== (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD))
    return json({ ok: false, message: "비밀번호가 맞지 않습니다." }, 401);

  const st = store();
  if (d.action === "sms") {
    const key = `app/${clean(d.id, 40)}`;
    const app = await st.get(key, { type: "json" });
    if (!app) return json({ ok: false, message: "신청 내역을 찾을 수 없습니다." }, 404);
    const text = clean(d.text, 1000);
    if (!text) return json({ ok: false, message: "문자 내용을 입력해 주세요." }, 400);
    const r = await sendSms([app.parentPhone], text);
    if (!r.ok) return json({ ok: false, message: r.reason === "not-configured" ? "문자 발송 설정이 아직 없습니다. '내 휴대폰으로 보내기'를 이용해 주세요." : "발송 실패: " + r.reason });
    app.sms = [...(app.sms || []), { at: new Date().toISOString(), text }];
    if (app.status === "접수") app.status = "연락 완료";
    await st.setJSON(key, app);
  }
  if (d.action === "smslog") {
    const key = `app/${clean(d.id, 40)}`;
    const app = await st.get(key, { type: "json" });
    if (app) { app.sms = [...(app.sms || []), { at: new Date().toISOString(), text: clean(d.text, 1000), via: "phone" }]; await st.setJSON(key, app); }
  }
  if (d.action === "test") {
    const r = await sendSms(adminPhones(), "[서강 중등관] 관리자 알림 문자 시험 발송입니다.");
    if (!r.ok) return json({ ok: false, message: r.reason === "not-configured" ? "문자 발송 설정(SOLAPI_API_KEY 등)이 없습니다." : r.reason === "no-recipient" ? "ADMIN_PHONES(알림 받을 번호)가 없습니다." : "발송 실패: " + r.reason });
  }
  if (d.action === "update" || d.action === "delete") {
    const key = `app/${clean(d.id, 40)}`;
    const app = await st.get(key, { type: "json" });
    if (!app) return json({ ok: false, message: "신청 내역을 찾을 수 없습니다." }, 404);
    if (d.action === "delete") {
      await st.delete(key);
      if (app.seatKey) await st.delete(app.seatKey);   // 반배치고사 자리 다시 열기
      if (app.event) await st.delete(`dup/${app.event}/${String(app.parentPhone).replace(/\D/g, "")}-${app.studentName}`);
    }
    else {
      if (STATUSES.includes(d.status)) app.status = d.status;
      if (typeof d.adminMemo === "string") app.adminMemo = clean(d.adminMemo, 500);
      app.updatedAt = new Date().toISOString();
      await st.setJSON(key, app);
    }
  }
  const { blobs } = await st.list({ prefix: "app/" });
  const apps = (await Promise.all(blobs.map(b => st.get(b.key, { type: "json" })))).filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({ ok: true, apps, statuses: STATUSES, smsReady: smsReady(), adminPhones: adminPhones().map(p => p.slice(0, 3) + "-****-" + p.slice(-4)) });
};

export const config = { path: "/api/admin" };
