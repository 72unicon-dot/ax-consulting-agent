import Link from "next/link";

const features = [
  {
    title: "진단 인터뷰",
    desc: "고객사의 현황을 구조적으로 청취하고 핵심 이슈를 추출합니다.",
  },
  {
    title: "AX 로드맵 설계",
    desc: "짧게는 3개월, 길게는 3년 단위의 AI 전환 실행 계획을 만듭니다.",
  },
  {
    title: "보고서 자동 생성",
    desc: "인터뷰와 데이터 기반으로 컨설팅 보고서 초안을 자동으로 작성합니다.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-24">
      <div className="w-full max-w-4xl">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-medium tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
            AX Consulting Agent · Phase 1
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            제조 혁신을 위한 AI 컨설팅 에이전트
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            현장 진단부터 AI 도입 로드맵, 보고서 작성까지. 컨설턴트의 사고 흐름을
            그대로 구현한 에이전트가 프로젝트 사이클 전 과정을 함께합니다.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/health"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              시스템 상태 확인
            </Link>
            <a
              href="https://github.com/72unicon-dot/ax-consulting-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              GitHub 저장소
            </a>
          </div>
        </header>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </section>

        <footer className="mt-24 text-xs text-zinc-500 dark:text-zinc-500">
          Next.js 16 · Supabase · Anthropic Claude · Phase 1 scaffold
        </footer>
      </div>
    </main>
  );
}
