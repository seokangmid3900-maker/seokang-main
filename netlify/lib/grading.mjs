// 반배치고사 채점 · 분석 공통 로직
export const DEFAULT_TEST = {
  title: "예비중1 반배치고사",
  // ※ 실제 시험지에 맞게 관리자 화면(채점 > 시험 설정)에서 바꾸세요.
  questions: [
    ...[1,2,3].map(n => ({ no: n, unit: "약수와 배수", pts: n === 3 ? 5 : 4 })),
    ...[4,5,6].map(n => ({ no: n, unit: "분수·소수의 계산", pts: n === 6 ? 5 : 4 })),
    ...[7,8,9].map(n => ({ no: n, unit: "비와 비율", pts: 5 })),
    ...[10,11,12].map(n => ({ no: n, unit: "평면·입체도형", pts: 5 })),
    ...[13,14,15,16].map(n => ({ no: n, unit: "소인수분해 (중1)", pts: 5 })),
    ...[17,18,19,20].map(n => ({ no: n, unit: "정수와 유리수 (중1)", pts: 6 })),
  ],
  cut: { strong: 85, weak: 60, sunpul: 85, hinpul: 60 },   // 단원 강점 ≥85%, 보완 <60% / 전체 85% 이상 선풀, 60% 이상 힌풀, 미만 함풀
};

export function analyze(test, wrong = []) {
  const W = new Set(wrong.map(Number));
  const total = test.questions.reduce((s, q) => s + Number(q.pts || 0), 0);
  let got = 0; const units = {};
  for (const q of test.questions) {
    const u = units[q.unit] ||= { unit: q.unit, total: 0, got: 0, count: 0, wrong: [] };
    u.total += Number(q.pts); u.count++;
    if (W.has(Number(q.no))) u.wrong.push(q.no); else { u.got += Number(q.pts); got += Number(q.pts); }
  }
  const list = Object.values(units).map(u => ({ ...u, rate: u.total ? Math.round(u.got / u.total * 100) : 0 }));
  const rate = total ? Math.round(got / total * 100) : 0;
  const strong = list.filter(u => u.rate >= test.cut.strong).map(u => u.unit);
  const weak = list.filter(u => u.rate < test.cut.weak).sort((a, b) => a.rate - b.rate).map(u => u.unit);
  const course = rate >= (test.cut.sunpul ?? 85) ? "선풀 (상 · HC · AA)" : rate >= test.cut.hinpul ? "힌풀 (중 · AB · BA)" : "함풀 (하 · BB · CC)";
  return { total, got, rate, units: list, strong, weak, course, wrongCount: W.size, count: test.questions.length };
}
