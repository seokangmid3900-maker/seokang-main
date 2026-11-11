// 문자 발송 (솔라피 SOLAPI) — Netlify 환경 변수가 있을 때만 동작합니다.
//   SOLAPI_API_KEY, SOLAPI_API_SECRET : 솔라피 콘솔 > API Key
//   SMS_FROM      : 솔라피에 등록한 발신번호 (예: 024063900)
//   ADMIN_PHONES  : 신청 알림을 받을 관리자 번호, 쉼표로 여러 명 (예: 01012345678,01098765432)
import crypto from "node:crypto";

const env = k => (process.env[k] || "").trim();
const digits = v => String(v || "").replace(/\D/g, "");

export const smsReady = () => !!(env("SOLAPI_API_KEY") && env("SOLAPI_API_SECRET") && env("SMS_FROM"));
export const adminPhones = () => env("ADMIN_PHONES").split(",").map(digits).filter(p => /^01\d{8,9}$/.test(p));

function auth() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", env("SOLAPI_API_SECRET")).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${env("SOLAPI_API_KEY")}, date=${date}, salt=${salt}, signature=${signature}`;
}

// to: 번호 배열, text: 내용 (90byte 넘으면 솔라피가 자동으로 장문(LMS) 처리)
export async function sendSms(to, text) {
  if (!smsReady()) return { ok: false, reason: "not-configured" };
  const list = [...new Set(to.map(digits))].filter(p => /^0\d{8,10}$/.test(p));
  if (!list.length) return { ok: false, reason: "no-recipient" };
  try {
    const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ messages: list.map(p => ({ to: p, from: digits(env("SMS_FROM")), text })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: j.errorMessage || j.message || `HTTP ${r.status}` };
    const failed = (j.failedMessageList || []).length;
    return { ok: failed === 0, sent: list.length - failed, failed, reason: failed ? "일부 실패" : "" };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

export const adminNotice = (a, site) =>
  `[중등관 상담신청]\n${a.studentName} (${a.school} · ${a.grade})\n학부모 ${a.parentPhone}\n${a.method}${a.when ? " · " + a.when : ""}${a.days ? "\n희망 " + a.days : ""}${a.memo ? "\n문의: " + a.memo.slice(0, 40) : ""}\n${site}/admin.html`;
