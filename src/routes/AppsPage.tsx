import { MY_APPS } from '../lib/myApps'
import { PageContainer } from '../components/PageContainer'
import { sectionCardClass } from '../lib/ui/classNames'
import { useStudents } from '../lib/hooks/useStudents'
import { openRandomDrawWithRoster } from '../lib/randomdrawIntegration'

export function AppsPage() {
  const { students, loading } = useStudents()

  return (
    <PageContainer size="standard">
      <h1 className="mb-1 text-2xl font-semibold text-brand-700">앱보관함</h1>
      <p className="mb-5 text-sm text-gray-500">직접 만든 다른 앱들을 바로 열어볼 수 있습니다.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MY_APPS.map((app) => (
          <a
            key={app.url}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (app.integration !== 'student-roster') return
              event.preventDefault()
              if (!loading) openRandomDrawWithRoster(students)
            }}
            className={`${sectionCardClass} flex flex-col items-center gap-2 py-6 text-center transition-transform hover:-translate-y-0.5`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <app.icon size={24} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-gray-900">{app.name}</span>
          </a>
        ))}
      </div>
    </PageContainer>
  )
}
