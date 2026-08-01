import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { SeatingGrid } from '../components/SeatingGrid'
import { createSeats, generatePlacement, mapGender } from '../lib/seating'
import type { Seat, SeatGender, SeatSeparation, SeparationType, TeacherDirection } from '../lib/types'

type ActiveTool =
  | { type: 'swap'; firstStudentId: string | null }
  | { type: 'fixed'; studentId: string }
  | { type: 'gender'; gender: SeatGender }

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
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === 'empty' ? 'disabled' : 'empty'))
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
      if (fixed.has(firstId) || fixed.has(studentId)) {
        setMessage('고정된 학생의 자리는 맞바꾸기할 수 없습니다.')
        setActiveTool(null)
        return
      }
      const firstSeatId = assignments.get(firstId)!
      const secondSeatId = assignments.get(studentId)!
      const firstSeat = getSeat(firstSeatId)!
      const secondSeat = getSeat(secondSeatId)!
      const firstGender = studentGenderById.get(firstId) ?? 'unspecified'
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
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed, separations, avoidPairs: new Set() },
        { genderBalance, previousAssignments: new Map() },
      )
      setAssignments(result)
      setMessage('필수 조건을 지키면서 새 자리표를 만들었습니다.')
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

  const conditionRows = useMemo(() => {
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
  }, [fixed, seats, separations, studentNameById])

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
        fixedSeatIds={new Set(fixed.values())}
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

      <div className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-lg font-semibold">조건 설정</h2>
        <p className="mb-3 text-sm text-gray-600">
          버튼을 누른 뒤 자리표에서 직접 좌석을 선택하세요. 배치된 학생 두 명을 차례로 클릭하면 바로 자리가 바뀝니다.
        </p>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            고정할 학생
            <select
              value={selectedFixedStudentId}
              onChange={(e) => setSelectedFixedStudentId(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={startFixedTool} className="rounded border border-gray-300 px-3 py-2 text-sm">
            학생 자리 직접 지정
          </button>
          <button onClick={() => startGenderTool('male')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            남학생 자리 지정
          </button>
          <button onClick={() => startGenderTool('female')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            여학생 자리 지정
          </button>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={genderBalance}
            disabled={!hasGenderInfo}
            onChange={(e) => setGenderBalance(e.target.checked)}
          />
          성별을 고려해 가능한 고르게 배치
        </label>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            학생 A
            <select
              value={separationStudentA}
              onChange={(e) => setSeparationStudentA(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            학생 B
            <select
              value={separationStudentB}
              onChange={(e) => setSeparationStudentB(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            분리 수준
            <select
              value={separationType}
              onChange={(e) => setSeparationType(e.target.value as SeparationType)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="orthogonal">앞뒤·좌우 인접 금지</option>
              <option value="diagonal">대각선 포함 인접 금지</option>
            </select>
          </label>
          <button onClick={addSeparation} className="rounded border border-gray-300 px-3 py-2 text-sm">
            분리 설정 추가
          </button>
        </div>

        {conditionMessage && <p className="mb-3 text-sm text-gray-600">{conditionMessage}</p>}

        <div className="flex flex-col gap-2">
          {conditionRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between rounded border border-gray-100 p-2 text-sm"
            >
              <div>
                <strong>{row.title}</strong>
                <p className="text-gray-500">{row.detail}</p>
              </div>
              <button onClick={row.onRemove} className="rounded border border-gray-300 px-2 py-1 text-xs">
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
