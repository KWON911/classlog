import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { SeatingGrid } from '../components/SeatingGrid'
import { createSeats, generatePlacement, mapGender } from '../lib/seating'
import type { Seat, TeacherDirection } from '../lib/types'

type ActiveTool = { type: 'swap'; firstStudentId: string | null }

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

  const columns = useMemo(() => seats.reduce((max, s) => Math.max(max, s.column), 0), [seats])
  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])

  function studentIdAtSeat(seatId: string): string | null {
    for (const [studentId, assignedSeatId] of assignments) {
      if (assignedSeatId === seatId) return studentId
    }
    return null
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
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === 'empty' ? 'disabled' : 'empty'))
  }

  function handleSeatClick(seatId: string) {
    const seat = seats.find((s) => s.id === seatId)
    if (!seat) return

    if (activeTool?.type === 'swap') {
      const studentId = studentIdAtSeat(seatId)
      if (!studentId) {
        setMessage('학생이 배치된 자리만 선택할 수 있습니다.')
        return
      }
      if (!activeTool.firstStudentId) {
        setActiveTool({ type: 'swap', firstStudentId: studentId })
        setMessage(
          `${studentNameById.get(studentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
        )
        return
      }
      if (activeTool.firstStudentId === studentId) {
        setMessage('서로 다른 두 학생을 선택해 주세요.')
        return
      }
      const firstId = activeTool.firstStudentId
      const firstSeatId = assignments.get(firstId)!
      const secondSeatId = assignments.get(studentId)!
      setAssignments((prev) => {
        const next = new Map(prev)
        next.set(firstId, secondSeatId)
        next.set(studentId, firstSeatId)
        return next
      })
      setActiveTool(null)
      setMessage(
        `${studentNameById.get(firstId) ?? ''}과(와) ${studentNameById.get(studentId) ?? ''}의 자리를 맞바꿨습니다.`,
      )
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
        prev.map((s) => (s.id === seatId ? { ...s, status: s.status === mode ? 'available' : mode } : s)),
      )
    }
  }

  function generate() {
    setErrorMessage('')
    setActiveTool(null)
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed: new Map(), separations: [], avoidPairs: new Set() },
        { genderBalance: false, previousAssignments: new Map() },
      )
      setAssignments(result)
      setMessage('새 자리표를 만들었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '자리 배치 중 문제가 발생했습니다.')
    }
  }

  function clearPlacement() {
    setActiveTool(null)
    setAssignments(new Map())
    setMessage('현재 배치를 초기화했습니다.')
  }

  const selectedSeatId =
    activeTool?.type === 'swap' && activeTool.firstStudentId
      ? (assignments.get(activeTool.firstStudentId) ?? null)
      : null

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학급 자리 배치</h1>
      <p className="mb-4 text-sm text-gray-600">학생 {students.length}명</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
        <label className="flex flex-col gap-1 text-sm">
          행
          <input
            type="number"
            min={1}
            max={12}
            value={rowsInput}
            onChange={(e) => setRowsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          열
          <input
            type="number"
            min={1}
            max={12}
            value={columnsInput}
            onChange={(e) => setColumnsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          칠판 방향
          <select
            value={teacherDirection}
            onChange={(e) => setTeacherDirection(e.target.value as TeacherDirection)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="north">위쪽</option>
            <option value="south">아래쪽</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          보기 방향
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'teacher' | 'back')}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="teacher">앞에서 볼 때(교사 시점)</option>
            <option value="back">뒤에서 볼 때</option>
          </select>
        </label>
        <button onClick={applyLayout} className="rounded border border-gray-300 px-3 py-2 text-sm">
          좌석 구조 적용
        </button>
        <button
          onClick={toggleSeatEditMode}
          className={`rounded border px-3 py-2 text-sm ${seatEditMode ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
        >
          {seatEditMode === 'disabled' ? '사용 안 함 지정 중' : seatEditMode === 'empty' ? '빈자리 지정 중' : '빈자리 지정'}
        </button>
      </div>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}

      <SeatingGrid
        seats={seats}
        columns={columns}
        teacherDirection={teacherDirection}
        viewMode={viewMode}
        assignments={assignments}
        students={students}
        fixedSeatIds={new Set()}
        selectedSeatId={selectedSeatId}
        onSeatClick={handleSeatClick}
      />

      <p className="mb-6 text-sm text-gray-600">{message}</p>

      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={generate} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          자리 배치 시작
        </button>
        <button onClick={generate} className="rounded border border-gray-300 px-3 py-2 text-sm">
          재배치하기
        </button>
        <button onClick={clearPlacement} className="rounded border border-gray-300 px-3 py-2 text-sm">
          초기화
        </button>
      </div>
    </div>
  )
}
