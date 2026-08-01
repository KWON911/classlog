function thisWeekRangeLabel() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`
  return `이번 주 (${fmt(monday)} ~ ${fmt(friday)})`
}

export function HomePage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">홈</h1>
      <p className="mt-1 text-gray-600">안녕하세요, 권쌤!</p>
      <p className="mt-1 text-sm text-gray-400">{thisWeekRangeLabel()}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[14px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">이번 주 시간표</h2>
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            시간표 연동 준비 중입니다.
          </p>
        </section>
        <section className="rounded-[14px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">이번 주 급식</h2>
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            급식 정보 연동 준비 중입니다.
          </p>
        </section>
      </div>
    </div>
  )
}
