import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/home')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5">
      <div className="mb-10 w-full max-w-[480px] rounded-[18px] border border-gray-200 bg-white p-9 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] sm:mb-16">
        <div className="flex flex-col items-center gap-3">
          <img src="/login-logo.png" alt="Classlog" className="h-auto w-32 sm:w-40" />
          <h1 className="text-2xl font-bold text-brand-700">학급 로그인</h1>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-[10px] border border-slate-300 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-[10px] border border-slate-300 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-[10px] bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}
