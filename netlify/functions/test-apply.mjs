// 무료 반배치고사 신청 — GET: 회차별 잔여석 / POST: 신청
import { EVENT } from "../lib/config.mjs";
import { store, json, clean } from "../lib/db.mjs";
import { sendSms, adminPhones } from "../lib/sms.mjs";

async function claim(st, key, id) {
  const cur = await st.get(key);
  if (cur) return cur === id;
  try { const r = await st.set(key, id, { onlyIfNew: true }); if (r && r.modified === false) return false; } catch (e) {}
  return (await st.get(key)) === id;
}
async function remaining(st) {
  const { blobs } = await st.list({ prefix: `seat/${EVENT.id}/` });
  const used = {};
  blobs.forEach(b => { const s = b.key.split("/")[2]; used[s] = (used[s] || 0) + 1; });
  return Object.fromEntries(Object.entries(EVENT.slots).map(([s, cap]) => [s, Math.max(0, cap - (used[s.replace(":", "")] || 0))]));
}

export default async (req) => {
  const st = store();
  if (req.method === "GET") return json({ ok: true, event: EVENT, remaining: await remaining(st) });
  if (req.method !== "POST") return json({ ok: false }, 405);
  if (!EVENT.open) return json({ ok: false, closed: true, message: "신청이 마감되었습니다." });

  let d; try { d = await req.json(); } catch { return json({ ok: false, message: "잘못된 요청" }, 400); }
  if (d.website) return json({ ok: true, id: "x" });
  const slot = clean(d.slot, 5);
  const app = {
    type: "추가 반배치", event: EVENT.id, slot,
    studentName: clean(d.studentName, 30), school: clean(d.school, 40), grade: "초6 (예비중1)",
    member: clean(d.member, 20), parentName: clean(d.parentName, 30), parentPhone: clean(d.parentPhone, 20),
    study: clean(d.study, 30), progress: clean(d.progress, 60), memo: clean(d.memo, 500),
    referrer: clean(d.referrer, 30), source: clean(d.source, 30) || "진단평가 페이지",
    adConsent: d.adConsent === true, adConsentAt: d.adConsent === true ? new Date().toISOString() : null,
    method: "진단평가 후 결과 상담", when: `${EVENT.dateLabel} ${slot}`, days: "",
  };
  if (!EVENT.slots[slot]) return json({ ok: false, message: "회차를 선택해 주세요." }, 400);
  if (!app.studentName || !app.school || !app.member) return json({ ok: false, message: "필수 항목을 모두 입력해 주세요." }, 400);
  if (!/^01\d-\d{3,4}-\d{4}$/.test(app.parentPhone)) return json({ ok: false, message: "학부모 연락처를 확인해 주세요." }, 400);
  if (d.agree !== true) return json({ ok: false, message: "개인정보 수집·이용에 동의해 주세요." }, 400);

  // 같은 연락처 + 같은 학생 중복 신청 막기
  const dupKey = `dup/${EVENT.id}/${app.parentPhone.replace(/\D/g, "")}-${app.studentName}`;
  if (await st.get(dupKey)) return json({ ok: false, message: "이미 신청되어 있습니다. 변경은 02.406.3900로 연락 주세요." });

  const id = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 7);
  const cap = EVENT.slots[slot], sk = slot.replace(":", "");
  let seat = null;
  for (let n = 1; n <= cap && !seat; n++) if (await claim(st, `seat/${EVENT.id}/${sk}/${n}`, id)) seat = n;
  if (!seat) return json({ ok: false, full: true, message: `${slot} 회차가 방금 마감되었습니다. 다른 회차를 선택해 주세요.`, remaining: await remaining(st) });

  const rec = { id, createdAt: new Date().toISOString(), ...app, seatKey: `seat/${EVENT.id}/${sk}/${seat}`, status: "접수", adminMemo: "", sms: [] };
  await st.setJSON(`app/${id}`, rec);
  await st.set(dupKey, id);

  const phones = adminPhones();
  if (phones.length) {
    const site = process.env.URL || new URL(req.url).origin;
    const r = await sendSms(phones, `[본관 진단평가 신청]\n${app.studentName} (${app.school})\n${EVENT.dateLabel} ${slot} 회차\n학부모 ${app.parentPhone}${app.referrer ? "\n소개: " + app.referrer : ""}\n${site}/admin.html`);
    rec.adminAlert = { at: new Date().toISOString(), ok: r.ok, reason: r.reason || "" };
    await st.setJSON(`app/${id}`, rec);
  }
  return json({ ok: true, id, slot });
};

export const config = { path: "/api/test-apply" };
