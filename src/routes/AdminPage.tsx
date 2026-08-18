import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import type { ManagedAccount } from '../lib/admin'
import { isAdminEmail } from '../lib/admin'
import { useAuth } from '../lib/hooks/useAuth'
import { useAdminAccounts } from '../lib/hooks/useAdminAccounts'
import { Modal } from '../components/Modal'
import { PageContainer } from '../components/PageContainer'
import { sectionCardClass } from '../lib/ui/classNames'

function AccountCounts({ account }: { account: ManagedAccount }) {
  return (
    <p className="mt-2 text-sm text-slate-500">
      학생 {account.student_count}명 · 기록 {account.record_count}건 · 출결 {account.attendance_count}건 · 자리배치{' '}
      {account.seating_plan_count}건 · 학교 설정 {account.has_school_settings ? '있음' : '없음'}
    </p>
  )
}

export function AdminPage() {
  const { session, loading: authLoading } = useAuth()
  const isAdmin = isAdminEmail(session?.user.email)
  const { accounts, loading, error, resetAccount } = useAdminAccounts(isAdmin)
  const [target, setTarget] = useState<ManagedAccount | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleReset() {
    if (!target || confirmation !== '초기화') return
    setPending(true)
    setActionError(null)
    const result = await resetAccount(target.teacher_id)
    setPending(false)
    if (result.error) {
      setActionError(result.error)
      return
    }
    setTarget(null)
    setConfirmation('')
  }

  if (authLoading) return null

  if (!isAdmin) {
    return (
      <PageContainer size="standard">
        <h1 className="text-2xl font-semibold text-brand-700">관리자</h1>
        <p className="mt-4 text-sm text-slate-600">이 화면은 관리자 계정만 사용할 수 있습니다.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="standard">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-brand-700">관리자 데이터 초기화</h1>
          <p className="mt-1 text-sm text-slate-500">로그인 계정은 유지하고, 선택한 계정의 앱 데이터만 영구 삭제합니다.</p>
        </div>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-slate-500">계정 정보를 불러오는 중입니다.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {accounts.map((account) => (
            <section key={account.teacher_id} className={`${sectionCardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
              <div>
                <h2 className="font-semibold text-slate-900">{account.email}</h2>
                <AccountCounts account={account} />
              </div>
              <button
                type="button"
                onClick={() => setTarget(account)}
                className="h-10 shrink-0 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                데이터 초기화
              </button>
            </section>
          ))}
        </div>
      )}

      {target && (
        <Modal
          title="계정 데이터 초기화"
          description={`${target.email} 계정의 앱 데이터를 영구 삭제합니다.`}
          onClose={() => {
            if (!pending) {
              setTarget(null)
              setConfirmation('')
              setActionError(null)
            }
          }}
          maxWidthClassName="max-w-md"
        >
          <p className="text-sm leading-6 text-slate-700">
            학생, 생활기록, 출결, 자리배치, 학교 설정이 삭제됩니다. 로그인 계정과 랜덤뽑기 브라우저 히스토리는 유지됩니다.
          </p>
          <label className="mt-5 block text-sm font-semibold text-slate-800">
            계속하려면 <span className="text-red-600">초기화</span>를 입력하세요.
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
            />
          </label>
          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setTarget(null)}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={pending || confirmation !== '초기화'}
              onClick={() => void handleReset()}
              className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? '초기화 중...' : '영구 삭제'}
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}
