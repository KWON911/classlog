/**
 * Supabase 구현 — `growth_points` 테이블(supabase/schema.sql 하단)이 만들어지면
 * constants.ts의 GROWTH_GARDEN_DATA_SOURCE를 'supabase'로 바꾸는 것만으로 활성화된다.
 *
 * 프로젝트 규칙상 `supabase` import는 lib/hooks에만 두지만, 이 앱은 데이터 접근을
 * 서비스 레이어로 한 번 더 감싸는 구조라 훅 대신 여기가 유일한 접근 지점이 된다
 * (NEIS의 services/neis-service.ts와 같은 예외 패턴).
 */
import { supabase } from '../../supabaseClient'
import type { GrowthPointEntry } from '../../types'
import type { EntryRange, GrowthGardenService, NewGrowthPointEntry } from './types'

const TABLE = 'growth_points'

export const supabaseGrowthGardenService: GrowthGardenService = {
  async listEntries(range?: EntryRange) {
    // 범위를 주면 그 기간만 가져온다 — 월별 리포트가 전체 기록을 매번 끌어오지 않도록.
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    if (range?.from) query = query.gte('created_at', range.from)
    if (range?.to) query = query.lt('created_at', range.to)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { data: (data ?? []) as GrowthPointEntry[] }
  },

  async addEntry(input: NewGrowthPointEntry) {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        student_id: input.student_id,
        teacher_id: teacherId,
        type: input.type,
        amount: Math.abs(input.amount),
        reason: input.reason,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { data: data as GrowthPointEntry }
  },

  /**
   * 일괄 저장 — 학생 수만큼 요청을 보내지 않고 배열 하나를 insert한다.
   * 원자성은 이 한 문장이 보장한다: RLS의 with check가 행마다 평가되므로 남의 학생
   * id가 섞여 있으면 그 행에서 문장 전체가 실패하고 아무것도 저장되지 않는다.
   * 점수(성장 포인트)는 따로 저장하는 값이 아니라 이 기록들에서 파생되므로
   * "기록은 저장됐는데 점수 갱신만 실패" 같은 어긋남 자체가 존재하지 않는다.
   */
  async addEntries(inputs: NewGrowthPointEntry[]) {
    if (inputs.length === 0) return { data: [] }

    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    const rows = inputs.map((input) => ({
      student_id: input.student_id,
      teacher_id: teacherId,
      type: input.type,
      amount: Math.abs(input.amount),
      reason: input.reason,
      source: input.source ?? 'individual',
      batch_id: input.batch_id ?? null,
    }))

    const { data, error } = await supabase.from(TABLE).insert(rows).select()
    if (error) return { error: error.message }
    return { data: (data ?? []) as GrowthPointEntry[] }
  },

  async deleteEntry(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) return { error: error.message }
    return {}
  },

  /** batch_id가 일치하는 행만 지운다 — 다른 기록은 조건에 걸리지 않는다. */
  async deleteBatch(batchId: string) {
    const { error } = await supabase.from(TABLE).delete().eq('batch_id', batchId)
    if (error) return { error: error.message }
    return {}
  },

  async clearStudent(studentId: string) {
    const { error } = await supabase.from(TABLE).delete().eq('student_id', studentId)
    if (error) return { error: error.message }
    return {}
  },

  /**
   * 조건 없는 delete는 PostgREST가 막으므로 항상 참인 필터를 하나 건다.
   * 실제 삭제 범위는 RLS가 담당 교사 것으로 한정한다(useStudents.deleteAllStudents와 같은 관례).
   */
  async clearClass() {
    const { error } = await supabase.from(TABLE).delete().not('id', 'is', null)
    if (error) return { error: error.message }
    return {}
  },
}
