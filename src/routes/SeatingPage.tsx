import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useSeatingPlans, type SeatingPlanInput } from '../lib/hooks/useSeatingPlans'
import { SeatingGrid } from '../components/SeatingGrid'
import { Modal } from '../components/Modal'
import { PageContainer } from '../components/PageContainer'
import {
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionCardClass,
} from '../lib/ui/classNames'
import {
  createSeats,
  derivePastNeighborPairs,
  derivePastSeatsByStudent,
  filterPlansByScope,
  generatePlacement,
  mapGender,
} from '../lib/seating'
import type {
  PreviousSeatHistoryScope,
  Seat,
  SeatGender,
  SeatingPlan,
  SeatSeparation,
  SeparationType,
  TeacherDirection,
} from '../lib/types'

const PREVIOUS_SEAT_SCOPE_LABELS: Record<PreviousSeatHistoryScope, string> = {
  latest1: '최근 1회',
  latest3: '최근 3회',
  currentSemester: '이번 학기',
  all: '전체 저장 기록',
}

type ActiveTool =
  | { type: 'swap'; firstStudentId: string | null }
  | { type: 'fixed'; studentId: string }
  | { type: 'gender'; gender: SeatGender }

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function todayYearMonth() {
  return todayDate().slice(0, 7)
}

const dangerButtonClass =
  'rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100'
const toolbarPrimaryButtonClass =
  'h-11 rounded-[11px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700'
const toolbarSecondaryButtonClass =
  'h-11 rounded-[11px] border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
const toolbarSecondaryActiveClass =
  'h-11 rounded-[11px] border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100'
const toolbarNeutralButtonClass =
  'h-11 rounded-[11px] border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100'

export function SeatingPage() {
  const { students } = useStudents()

  const [rowsInput, setRowsInput] = useState(5)
  const [columnsInput, setColumnsInput] = useState(6)
  const [teacherDirection, setTeacherDirection] = useState<TeacherDirection>('north')
  const [viewMode, setViewMode] = useState<'teacher' | 'back'>('teacher')
  const [seats, setSeats] = useState<Seat[]>(() => createSeats(5, 6))
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map())
  const [seatEditMode, setSeatEditMode] = useState<'empty' | 'disabled' | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [message, setMessage] = useState('학생 명단을 불러온 뒤 자리 배치 시작을 눌러 주세요.')
  const [errorMessage, setErrorMessage] = useState('')

  const [fixed, setFixed] = useState<Map<string, string>>(new Map())
  const [separations, setSeparations] = useState<SeatSeparation[]>([])
  const [genderBalance, setGenderBalance] = useState(false)
  const [selectedFixedStudentId, setSelectedFixedStudentId] = useState('')
  const [separationStudentA, setSeparationStudentA] = useState('')
  const [separationStudentB, setSeparationStudentB] = useState('')
  const [separationType, setSeparationType] = useState<SeparationType>('orthogonal')
  const [conditionMessage, setConditionMessage] = useState('')

  const [manuallyMoved, setManuallyMoved] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [planDate, setPlanDate] = useState(todayDate())
  const [recordMonth, setRecordMonth] = useState(todayYearMonth())
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [avoidPastNeighbors, setAvoidPastNeighbors] = useState(false)
  const [avoidPreviousSeats, setAvoidPreviousSeats] = useState(false)
  const [previousSeatHistoryScope, setPreviousSeatHistoryScope] = useState<PreviousSeatHistoryScope>('latest3')
  const [saveMessage, setSaveMessage] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Fetched once, unfiltered — the Archive list (this month only) and the
  // "지난 짝 피하기"/"이전에 앉았던 자리 피하기" history both derive from this
  // single source, so saving a new plan updates every view immediately
  // without a page reload.
  const { plans: allPlans, loading: plansLoading, error: plansError, savePlan, deletePlan } = useSeatingPlans('all')
  const archivePlans = useMemo(
    () => allPlans.filter((plan) => plan.plan_date.slice(0, 7) === recordMonth),
    [allPlans, recordMonth],
  )
  const noPreviousSeatHistory = !plansLoading && allPlans.length === 0

  const columns = useMemo(() => seats.reduce((max, s) => Math.max(max, s.column), 0), [seats])
  const studentGenderById = useMemo(
    () => new Map(students.map((s) => [s.id, mapGender(s.gender)])),
    [students],
  )
  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])
  const hasGenderInfo = useMemo(() => students.some((s) => mapGender(s.gender) !== 'unspecified'), [students])

  function getSeat(seatId: string): Seat | undefined {
    return seats.find((s) => s.id === seatId)
  }

  function studentIdAtSeat(seatId: string): string | null {
    for (const [studentId, assignedSeatId] of assignments) {
      if (assignedSeatId === seatId) return studentId
    }
    return null
  }

  function clearCurrentPlacement() {
    if (assignments.size) {
      setAssignments(new Map())
      setMessage('조건이 바뀌었습니다. 자리 배치 시작을 눌러 다시 만들어 주세요.')
    }
  }

  function applyLayout() {
    if (
      !Number.isInteger(rowsInput) ||
      !Number.isInteger(columnsInput) ||
      rowsInput < 1 ||
      columnsInput < 1 ||
      rowsInput > 12 ||
      columnsInput > 12
    ) {
      setErrorMessage('행과 열은 각각 1부터 12까지 입력해 주세요.')
      return
    }
    if (assignments.size && !window.confirm('좌석 구조를 바꾸면 현재 배치와 조건이 초기화됩니다. 계속할까요?')) {
      return
    }
    setSeats(createSeats(rowsInput, columnsInput))
    setAssignments(new Map())
    setFixed(new Map())
    setSeparations([])
    setSavedPlanId(null)
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === null ? 'empty' : prev === 'empty' ? 'disabled' : null))
  }

  function toggleViewMode() {
    setViewMode((prev) => (prev === 'teacher' ? 'back' : 'teacher'))
  }

  function startFixedTool() {
    if (!selectedFixedStudentId) {
      setConditionMessage('먼저 고정할 학생을 선택해 주세요.')
      return
    }
    setActiveTool({ type: 'fixed', studentId: selectedFixedStudentId })
    setMessage(
      `${studentNameById.get(selectedFixedStudentId) ?? '선택한 학생'}의 자리를 자리표에서 직접 클릭해 주세요.`,
    )
    setShowSettings(false)
  }

  function startGenderTool(gender: SeatGender) {
    if (!students.some((s) => mapGender(s.gender) === gender)) {
      setConditionMessage(`명단에 ${gender === 'male' ? '남학생' : '여학생'} 정보가 없습니다.`)
      return
    }
    setActiveTool({ type: 'gender', gender })
    setMessage(
      `${gender === 'male' ? '남학생' : '여학생'} 전용으로 할 자리를 직접 클릭해 주세요. 같은 자리를 다시 누르면 해제됩니다.`,
    )
    setShowSettings(false)
  }

  function addSeparation() {
    if (!separationStudentA || !separationStudentB || separationStudentA === separationStudentB) {
      setConditionMessage('서로 다른 두 학생을 선택해 주세요.')
      return
    }
    const duplicate = separations.some(
      (item) =>
        (item.student_a === separationStudentA && item.student_b === separationStudentB) ||
        (item.student_a === separationStudentB && item.student_b === separationStudentA),
    )
    if (duplicate) {
      setConditionMessage('이미 설정된 분리 조건입니다.')
      return
    }
    setSeparations((prev) => [
      ...prev,
      { student_a: separationStudentA, student_b: separationStudentB, type: separationType },
    ])
    setConditionMessage('분리 설정을 추가했습니다.')
  }

  function removeFixed(studentId: string) {
    setFixed((prev) => {
      const next = new Map(prev)
      next.delete(studentId)
      return next
    })
    clearCurrentPlacement()
  }

  function removeGenderSeat(seatId: string) {
    setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, genderSeat: undefined } : s)))
    clearCurrentPlacement()
  }

  function removeSeparation(index: number) {
    setSeparations((prev) => prev.filter((_, i) => i !== index))
    clearCurrentPlacement()
  }

  function handleSeatClick(seatId: string) {
    const seat = getSeat(seatId)
    if (!seat) return

    if (activeTool?.type === 'swap') {
      const studentId = studentIdAtSeat(seatId)
      if (!activeTool.firstStudentId) {
        if (!studentId) {
          setMessage('학생이 배치된 자리만 선택할 수 있습니다.')
          return
        }
        setActiveTool({ type: 'swap', firstStudentId: studentId })
        setMessage(
          `${studentNameById.get(studentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리 또는 빈 좌석을 클릭해 주세요.`,
        )
        return
      }
      if (activeTool.firstStudentId === studentId) {
        setMessage('서로 다른 두 학생을 선택해 주세요.')
        return
      }
      const firstId = activeTool.firstStudentId
      if (fixed.has(firstId) || (studentId && fixed.has(studentId))) {
        setMessage('고정된 학생의 자리는 맞바꾸기할 수 없습니다.')
        setActiveTool(null)
        return
      }
      const firstSeatId = assignments.get(firstId)!
      const firstSeat = getSeat(firstSeatId)!
      const firstGender = studentGenderById.get(firstId) ?? 'unspecified'

      if (!studentId) {
        if (seat.status !== 'available') {
          setMessage('사용 가능한 좌석으로만 이동할 수 있습니다.')
          setActiveTool(null)
          return
        }
        const canUseTarget = !seat.genderSeat || firstGender === seat.genderSeat
        if (!canUseTarget) {
          setMessage('성별 지정 좌석 조건과 맞지 않아 이동할 수 없습니다.')
          setActiveTool(null)
          return
        }
        setAssignments((prev) => {
          const next = new Map(prev)
          next.set(firstId, seatId)
          return next
        })
        setManuallyMoved((prev) => new Set(prev).add(firstId))
        setActiveTool(null)
        setMessage(`${studentNameById.get(firstId) ?? ''}을(를) 새 자리로 이동했습니다.`)
        return
      }

      const secondSeatId = assignments.get(studentId)!
      const secondSeat = getSeat(secondSeatId)!
      const secondGender = studentGenderById.get(studentId) ?? 'unspecified'
      const firstCanUseSecond = !secondSeat.genderSeat || firstGender === secondSeat.genderSeat
      const secondCanUseFirst = !firstSeat.genderSeat || secondGender === firstSeat.genderSeat
      if (!firstCanUseSecond || !secondCanUseFirst) {
        setMessage('성별 지정 좌석 조건과 맞지 않아 자리를 바꿀 수 없습니다.')
        setActiveTool(null)
        return
      }
      setAssignments((prev) => {
        const next = new Map(prev)
        next.set(firstId, secondSeatId)
        next.set(studentId, firstSeatId)
        return next
      })
      setManuallyMoved((prev) => new Set(prev).add(firstId).add(studentId))
      setActiveTool(null)
      setMessage(
        `${studentNameById.get(firstId) ?? ''}과(와) ${studentNameById.get(studentId) ?? ''}의 자리를 맞바꿨습니다.`,
      )
      return
    }

    if (activeTool?.type === 'fixed' || activeTool?.type === 'gender') {
      if (seat.status !== 'available') {
        setConditionMessage('사용 가능한 좌석만 지정할 수 있습니다.')
        return
      }
      if (activeTool.type === 'fixed') {
        const studentId = activeTool.studentId
        const conflictingStudentId = [...fixed.entries()].find(
          ([sid, assignedSeatId]) => assignedSeatId === seatId && sid !== studentId,
        )?.[0]
        if (conflictingStudentId) {
          setConditionMessage('이미 다른 학생이 고정된 좌석입니다.')
          return
        }
        clearCurrentPlacement()
        setFixed((prev) => new Map(prev).set(studentId, seatId))
        setActiveTool(null)
        setConditionMessage('학생 고정 자리를 지정했습니다.')
      } else {
        clearCurrentPlacement()
        const gender = activeTool.gender
        const isSameGender = seat.genderSeat === gender
        setSeats((prev) =>
          prev.map((s) => (s.id === seatId ? { ...s, genderSeat: isSameGender ? undefined : gender } : s)),
        )
        setConditionMessage(
          isSameGender
            ? `${gender === 'male' ? '남학생' : '여학생'} 자리 지정을 해제했습니다.`
            : `${gender === 'male' ? '남학생' : '여학생'} 자리로 지정했습니다. 계속 좌석을 클릭해 여러 자리를 지정할 수 있습니다.`,
        )
      }
      return
    }

    const occupiedStudentId = studentIdAtSeat(seatId)
    if (occupiedStudentId) {
      setActiveTool({ type: 'swap', firstStudentId: occupiedStudentId })
      setMessage(
        `${studentNameById.get(occupiedStudentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
      )
      return
    }

    if (seatEditMode) {
      const mode = seatEditMode
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seatId ? { ...s, status: s.status === mode ? 'available' : mode, genderSeat: undefined } : s,
        ),
      )
    }
  }

  function generate() {
    setErrorMessage('')
    setActiveTool(null)
    setSavedPlanId(null)
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const avoidPairs = avoidPastNeighbors ? derivePastNeighborPairs(archivePlans) : new Set<string>()

      let pastSeatsByStudent = new Map<string, Map<string, number>>()
      let excludedRecordCount = 0
      if (avoidPreviousSeats) {
        const currentSeatIds = new Set(seats.map((s) => s.id))
        const scopedPlans = filterPlansByScope(allPlans, previousSeatHistoryScope, todayDate())
        const derived = derivePastSeatsByStudent(scopedPlans, currentSeatIds)
        pastSeatsByStudent = derived.pastSeatsByStudent
        excludedRecordCount = derived.excludedRecordCount
      }

      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed, separations, avoidPairs },
        { genderBalance, previousAssignments: assignments, pastSeatsByStudent },
      )
      setAssignments(result)
      setManuallyMoved(new Set())

      const parts: string[] = [
        avoidPastNeighbors
          ? `기록 월의 지난 짝 ${avoidPairs.size}쌍을 피하면서 새 자리표를 만들었습니다.`
          : '필수 조건을 지키면서 새 자리표를 만들었습니다.',
      ]

      if (excludedRecordCount > 0) {
        parts.push(`현재 좌석 구조와 다른 과거 기록 ${excludedRecordCount}개를 제외했습니다.`)
      }

      if (avoidPreviousSeats) {
        const repeatedEntries = [...result.entries()].filter(
          ([studentId, seatId]) => pastSeatsByStudent.get(studentId)?.has(seatId),
        )
        const fixedRepeatedCount = repeatedEntries.filter(([studentId]) => fixed.has(studentId)).length
        const nonFixedRepeated = repeatedEntries.filter(([studentId]) => !fixed.has(studentId))

        if (fixedRepeatedCount > 0) {
          parts.push(`고정 좌석 학생 ${fixedRepeatedCount}명은 이전 좌석과 동일하게 배치되었습니다.`)
        }
        if (nonFixedRepeated.length > 0) {
          const detail = nonFixedRepeated
            .map(([studentId, seatId]) => {
              const seat = getSeat(seatId)
              return `${studentNameById.get(studentId) ?? ''}: ${seat ? `${seat.row}행 ${seat.column}열` : ''}`
            })
            .join(', ')
          parts.push(
            `가능한 한 이전 좌석을 피했지만 ${nonFixedRepeated.length}명의 좌석이 과거 기록과 겹쳤습니다 (${detail}).`,
          )
        } else if (fixedRepeatedCount === 0) {
          parts.push(
            pastSeatsByStudent.size > 0
              ? `${PREVIOUS_SEAT_SCOPE_LABELS[previousSeatHistoryScope]} 기록을 기준으로 이전 좌석을 피해 배치했습니다.`
              : `선택한 범위(${PREVIOUS_SEAT_SCOPE_LABELS[previousSeatHistoryScope]})에 해당하는 저장 기록이 없어 이전 좌석 피하기가 적용되지 않았습니다.`,
          )
        }
      }

      setMessage(parts.join(' '))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '자리 배치 중 문제가 발생했습니다.')
    }
  }

  function clearPlacement() {
    setSavedPlanId(null)
    setActiveTool(null)
    setAssignments(new Map())
    setMessage('현재 배치를 초기화했습니다.')
  }

  function buildPayload(): SeatingPlanInput {
    return {
      title,
      plan_date: planDate,
      rows: seats.reduce((max, s) => Math.max(max, s.row), 0),
      columns,
      teacher_direction: teacherDirection,
      seats,
      assignments: [...assignments.entries()].map(([student_id, seat_id]) => ({
        student_id,
        seat_id,
        is_fixed: fixed.get(student_id) === seat_id,
        source: manuallyMoved.has(student_id) ? 'manual' : 'automatic',
      })),
      separations,
      gender_balance: genderBalance,
      avoid_past_neighbors: avoidPastNeighbors,
      avoid_previous_seats: avoidPreviousSeats,
      previous_seat_history_scope: previousSeatHistoryScope,
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setSaveMessage('자리표 제목을 입력해 주세요.')
      return
    }
    if (!assignments.size) {
      setSaveMessage('학생 명단을 불러와 자리 배치한 뒤 저장해 주세요.')
      return
    }
    const result = await savePlan(savedPlanId, buildPayload())
    if (result.error) {
      setSaveMessage(result.error)
      return
    }
    if (result.data) {
      setSavedPlanId(result.data.id)
    }
    setSaveMessage('현재 자리표를 저장했습니다.')
  }

  function handleLoad(plan: SeatingPlan, duplicate = false) {
    setSeats(plan.seats)
    setAssignments(new Map(plan.assignments.map((a) => [a.student_id, a.seat_id])))
    setFixed(new Map(plan.assignments.filter((a) => a.is_fixed).map((a) => [a.student_id, a.seat_id])))
    setManuallyMoved(new Set(plan.assignments.filter((a) => a.source === 'manual').map((a) => a.student_id)))
    setSeparations(plan.separations)
    setTeacherDirection(plan.teacher_direction)
    setGenderBalance(plan.gender_balance)
    setAvoidPastNeighbors(plan.avoid_past_neighbors)
    setAvoidPreviousSeats(plan.avoid_previous_seats ?? false)
    setPreviousSeatHistoryScope(plan.previous_seat_history_scope ?? 'latest3')
    setRowsInput(plan.rows)
    setColumnsInput(plan.columns)
    setActiveTool(null)
    setShowSettings(false)
    setTitle(duplicate ? `${plan.title} 복제` : plan.title)
    setPlanDate(duplicate ? todayDate() : plan.plan_date)
    setSavedPlanId(duplicate ? null : plan.id)
    setSaveMessage(
      duplicate ? '자리표를 복제했습니다. 제목이나 조건을 수정한 뒤 새로 저장하세요.' : '저장된 자리표를 불러왔습니다.',
    )
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 자리표를 삭제할까요? 삭제한 기록은 되돌릴 수 없습니다.')) return
    const result = await deletePlan(id)
    if (result.error) {
      setSaveMessage(result.error)
      return
    }
    if (savedPlanId === id) setSavedPlanId(null)
    setSaveMessage('자리표를 삭제했습니다.')
  }

  const selectedSeatId =
    activeTool?.type === 'swap' && activeTool.firstStudentId
      ? (assignments.get(activeTool.firstStudentId) ?? null)
      : null

  const conditionRows = (() => {
    const rows: { key: string; title: string; detail: string; onRemove: () => void }[] = []
    for (const [studentId, seatId] of fixed) {
      const student = studentNameById.get(studentId)
      const seat = getSeat(seatId)
      if (student && seat) {
        rows.push({
          key: `fixed-${studentId}`,
          title: `${student} · ${seat.row}행 ${seat.column}열 고정`,
          detail: '다시 섞어도 이 위치를 유지합니다.',
          onRemove: () => removeFixed(studentId),
        })
      }
    }
    for (const seat of seats) {
      if (seat.genderSeat) {
        rows.push({
          key: `gender-${seat.id}`,
          title: `${seat.genderSeat === 'male' ? '남학생' : '여학생'} · ${seat.row}행 ${seat.column}열`,
          detail: '해당 성별 학생만 배치합니다.',
          onRemove: () => removeGenderSeat(seat.id),
        })
      }
    }
    separations.forEach((item, index) => {
      const a = studentNameById.get(item.student_a)
      const b = studentNameById.get(item.student_b)
      if (a && b) {
        rows.push({
          key: `separation-${index}`,
          title: `${a} · ${b} 분리`,
          detail:
            item.type === 'diagonal'
              ? '대각선을 포함해 인접하지 않게 배치합니다.'
              : '앞뒤·좌우로 인접하지 않게 배치합니다.',
          onRemove: () => removeSeparation(index),
        })
      }
    })
    return rows
  })()

  return (
    <PageContainer size="full">
      <div className="mb-4 flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-2xl font-semibold text-brand-700">우리 반 자리 배치</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className={toolbarSecondaryButtonClass}>
              설정
            </button>
            <button onClick={generate} className={toolbarPrimaryButtonClass}>
              자리 배치 시작
            </button>
          </div>
          <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <button onClick={generate} className={toolbarSecondaryButtonClass}>
              재배치하기
            </button>
            <button onClick={clearPlacement} className={toolbarNeutralButtonClass}>
              초기화
            </button>
          </div>
          <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleViewMode}
              className={viewMode === 'back' ? toolbarSecondaryActiveClass : toolbarSecondaryButtonClass}
              aria-pressed={viewMode === 'back'}
            >
              보기 전환
            </button>
            <button onClick={() => window.print()} className={toolbarNeutralButtonClass}>
              인쇄
            </button>
          </div>
        </div>
      </div>

      <p className="mb-4 hidden text-lg font-semibold print:block">
        {title || '자리표'} · {planDate}
      </p>

      {errorMessage && <p className="mb-4 text-red-600 print:hidden">{errorMessage}</p>}

      <SeatingGrid
        seats={seats}
        columns={columns}
        teacherDirection={teacherDirection}
        viewMode={viewMode}
        assignments={assignments}
        students={students}
        fixedSeatIds={new Set(fixed.values())}
        selectedSeatId={selectedSeatId}
        onSeatClick={handleSeatClick}
      />

      {message && (
        <p
          className="mb-6 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700 print:hidden"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {showSettings && (
        <Modal
          title="자리바꾸기 설정"
          description="필요한 항목을 설정한 뒤 닫으면 자리표 화면으로 돌아갑니다."
          onClose={() => setShowSettings(false)}
        >
          <div className="flex flex-col gap-6">
            <section className={sectionCardClass}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700">Layout</h3>
              <p className="mb-4 mt-1 text-sm text-gray-500">좌석 배치와 칠판 방향을 설정합니다.</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className={labelClass}>
                  행
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={rowsInput}
                    onChange={(e) => setRowsInput(Number(e.target.value))}
                    className={`w-20 ${fieldClass}`}
                  />
                </label>
                <label className={labelClass}>
                  열
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={columnsInput}
                    onChange={(e) => setColumnsInput(Number(e.target.value))}
                    className={`w-20 ${fieldClass}`}
                  />
                </label>
                <label className={labelClass}>
                  칠판 방향
                  <select
                    value={teacherDirection}
                    onChange={(e) => setTeacherDirection(e.target.value as TeacherDirection)}
                    className={fieldClass}
                  >
                    <option value="north">위쪽</option>
                    <option value="south">아래쪽</option>
                  </select>
                </label>
                <button onClick={applyLayout} className={primaryButtonClass}>
                  좌석 구조 적용
                </button>
                <button
                  onClick={toggleSeatEditMode}
                  className={
                    seatEditMode
                      ? 'h-11 rounded-lg border border-brand-600 bg-brand-50 px-4 text-sm font-medium text-brand-700 transition-colors'
                      : secondaryButtonClass
                  }
                >
                  {seatEditMode === 'disabled'
                    ? '사용 안 함 지정 중'
                    : seatEditMode === 'empty'
                      ? '빈자리 지정 중'
                      : '빈자리 지정'}
                </button>
              </div>
            </section>

            <section className={sectionCardClass}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700">Rules</h3>
              <p className="mb-4 mt-1 text-sm text-gray-500">
                버튼을 누른 뒤 자리표에서 직접 좌석을 선택하세요. 배치된 학생 두 명을 차례로 클릭하면 바로 자리가
                바뀝니다.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">학생 자리 고정</h4>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className={labelClass}>
                      고정할 학생
                      <select
                        value={selectedFixedStudentId}
                        onChange={(e) => setSelectedFixedStudentId(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">학생 선택</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.number}. {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button onClick={startFixedTool} className={secondaryButtonClass}>
                      학생 자리 직접 지정
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">성별 지정 좌석</h4>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => startGenderTool('male')} className={secondaryButtonClass}>
                      남학생 자리 지정
                    </button>
                    <button onClick={() => startGenderTool('female')} className={secondaryButtonClass}>
                      여학생 자리 지정
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={genderBalance}
                    disabled={!hasGenderInfo}
                    onChange={(e) => setGenderBalance(e.target.checked)}
                    className="accent-brand-600"
                  />
                  성별을 고려해 가능한 고르게 배치
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={avoidPastNeighbors}
                    onChange={(e) => setAvoidPastNeighbors(e.target.checked)}
                    className="accent-brand-600"
                  />
                  지난 짝 피하기 (아래 기록 월에 저장된 자리표 기준)
                </label>
              </div>

              <div className="mt-4 rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-800">기록 기반 규칙</h4>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={avoidPreviousSeats}
                    onChange={(e) => setAvoidPreviousSeats(e.target.checked)}
                    className="mt-0.5 accent-brand-600"
                    aria-describedby="avoid-previous-seats-description"
                  />
                  <span>
                    <span className="font-medium text-gray-800">이전에 앉았던 자리 피하기</span>
                    <span id="avoid-previous-seats-description" className="block text-xs text-gray-500">
                      저장된 자리표를 기준으로 같은 학생이 같은 자리에 다시 배치되지 않도록 합니다.
                    </span>
                  </span>
                </label>

                {avoidPreviousSeats && (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="previous-seat-scope" className="text-sm font-medium text-gray-700">
                        기록 범위
                      </label>
                      <select
                        id="previous-seat-scope"
                        value={previousSeatHistoryScope}
                        onChange={(e) => setPreviousSeatHistoryScope(e.target.value as PreviousSeatHistoryScope)}
                        disabled={noPreviousSeatHistory}
                        className={`${fieldClass} disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500`}
                      >
                        {(Object.entries(PREVIOUS_SEAT_SCOPE_LABELS) as [PreviousSeatHistoryScope, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    {noPreviousSeatHistory && (
                      <p className="mt-2 text-xs text-amber-700">
                        저장된 과거 자리표가 없습니다. 먼저 현재 자리표를 저장해 주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-800">분리 설정</h4>
                <div className="flex flex-wrap items-end gap-2">
                  <label className={labelClass}>
                    학생 A
                    <select
                      value={separationStudentA}
                      onChange={(e) => setSeparationStudentA(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">학생 선택</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    학생 B
                    <select
                      value={separationStudentB}
                      onChange={(e) => setSeparationStudentB(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">학생 선택</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    분리 수준
                    <select
                      value={separationType}
                      onChange={(e) => setSeparationType(e.target.value as SeparationType)}
                      className={fieldClass}
                    >
                      <option value="orthogonal">앞뒤·좌우 인접 금지</option>
                      <option value="diagonal">대각선 포함 인접 금지</option>
                    </select>
                  </label>
                  <button onClick={addSeparation} className={secondaryButtonClass}>
                    분리 설정 추가
                  </button>
                </div>
              </div>

              {conditionMessage && (
                <p className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700">
                  {conditionMessage}
                </p>
              )}

              {conditionRows.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {conditionRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm"
                    >
                      <div>
                        <strong className="text-gray-800">{row.title}</strong>
                        <p className="text-gray-500">{row.detail}</p>
                      </div>
                      <button onClick={row.onRemove} className={dangerButtonClass}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={sectionCardClass}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700">Archive</h3>
              <p className="mb-4 mt-1 text-sm text-gray-500">자리표를 저장하고 이전 기록을 불러올 수 있습니다.</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                <label className={labelClass}>
                  제목
                  <input
                    type="text"
                    maxLength={80}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 2026년 8월 1차 자리표"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  날짜
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  기록 월
                  <input
                    type="month"
                    value={recordMonth}
                    onChange={(e) => setRecordMonth(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <button onClick={handleSave} className={primaryButtonClass}>
                  현재 자리표 저장
                </button>
              </div>

              {saveMessage && <p className="mt-3 text-sm text-gray-600">{saveMessage}</p>}
              {plansError && <p className="mt-3 text-red-600">{plansError}</p>}

              <h4 className="mb-3 mt-6 text-sm font-semibold text-gray-800">자리바꾸기 목록</h4>
              {plansLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
              {!plansLoading && archivePlans.length === 0 && (
                <p className="text-sm text-gray-500">선택한 달에 저장된 자리표가 없습니다.</p>
              )}
              <ul className="flex flex-col gap-2">
                {archivePlans.map((plan) => (
                  <li
                    key={plan.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{plan.title}</p>
                      <p className="text-xs text-gray-500">
                        {plan.plan_date} · {plan.plan_date.slice(0, 7)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleLoad(plan)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => handleLoad(plan, true)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        복제
                      </button>
                      <button onClick={() => handleDelete(plan.id)} className={dangerButtonClass}>
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}
