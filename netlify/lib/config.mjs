// 저장소 이름 — 새 기수를 받을 때 이름을 바꾸면 빈 명단에서 시작합니다.
export const STORE_NAME = "main-consult-2026";

// 관리자 비밀번호 (Netlify 환경 변수 ADMIN_PASSWORD 가 있으면 그 값이 우선)
// ※ GitHub 저장소는 반드시 Private(비공개)로 만드세요.
export const DEFAULT_ADMIN_PASSWORD = "seokang3900";

export const STATUSES = ["접수", "연락 완료", "상담 완료", "반배치 예약", "등록", "보류"];

// ===== 무료 진단평가 행사 — public/test.html 화면도 이 값을 읽어 표시합니다 =====
export const EVENT = {
  id: "m1128",
  title: "예비중1 무료 진단평가 + 성적 분석 상담",
  date: "2026-11-28",
  dateLabel: "11월 28일(토)",
  place: "서강수학원 본관 2층 (서울 송파구 거마로 51)",
  // 회차: 시작 시각 → 정원
  slots: { "10:00": 15, "13:00": 15 },
  open: true,            // false 로 바꾸면 신청 마감
};
