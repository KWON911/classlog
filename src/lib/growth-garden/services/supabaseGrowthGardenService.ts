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
import type { GrowthGardenService, NewGrowthPointEntry } from './types'

const TABLE = 'growth_points'

export const supabaseGrowthGardenService: GrowthGardenService = {
  async listEntries() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })

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

  async deleteEntry(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) return { error: error.message }
    return {}
  },

  async clearStudent(studentId: string) {
    const { error } = await supabase.from(TABLE).delete().eq('student_id', studentId)
    if (error) return { error: error.message }
    return {}
  },
}
