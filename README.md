# 서강수학원 중등관(본관) · 예비중1 결과 상담 · 등록 사이트 (Netlify)

본관은 예비중1 진단평가 · 반배치고사를 마친 상태라, 이 사이트는 **반배치 결과 상담 → 등록**과 **미응시 가정의 추가 반배치고사**를 중심으로 만들었습니다.
신청 내용은 Netlify 안(Netlify Blobs)에 저장됩니다.

| 주소 | 내용 |
|---|---|
| `/` | 결과 상담 · 등록 신청 (상담 목적, 반배치 응시 여부) |
| `/leaflet` | 온라인 리플렛 — 선풀 · 힌풀 · 함풀 → 혼풀, 180분 수업 구조, 시즌제, 3년 로드맵 |
| `/test` | 추가 반배치고사 신청 (회차별 정원 · 선착순 · 중복 방지 · 친구 공유) |
| `/admin.html` | 신청 관리 (상태 · 메모 · 학부모 문자 · CSV) |
| `/grade.html` | 반배치 분석실 (틀린 문항 체크 채점 · 리포트 링크 · 통계 · 시험 설정) |
| `/r.html?t=…` | 학부모용 결과 분석 리포트 (개인 링크) |
| `/qr.html` | 사이트 주소에 맞춰 자동 생성되는 QR |

## 배포
1. GitHub **Private** 저장소 `seokang-main-consult` 생성 → 파일 업로드(또는 Claude가 올림)
2. Netlify → Import from GitHub → 저장소 선택 → Project name 정하고 Deploy
3. 관리자 비밀번호 기본값 **seokang3900** (`netlify/lib/config.mjs`, 환경 변수 `ADMIN_PASSWORD` 우선)

## 바꾸는 곳
- 추가 반배치 날짜 · 회차 · 정원 · 장소: `netlify/lib/config.mjs` 의 `EVENT`
- 시험 문항 · 단원 · 배점 · 추천 기준(선풀 · 힌풀 %): 분석실 '시험 설정' 탭
- 문자 자동 발송(솔라피): 환경 변수 `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SMS_FROM`(024063900), `ADMIN_PHONES`
