import { useCallback, useState } from 'react'
import type { PlantPulse } from '../../components/growth-garden/PlantIllustration'
import type { GrowthPointType } from '../types'

/**
 * 학생별 "방금 기록됨" 애니메이션 신호.
 *
 * 점수 자체는 서비스가 갖고 있으므로, 여기서는 어떤 학생의 식물이 지금 자라야
 * 하는지/되돌아가야 하는지만 관리한다. token은 같은 방향을 연속으로 눌러도
 * 애니메이션이 다시 재생되도록 매번 증가시킨다.
 */
export function usePlantPulse() {
  const [pulses, setPulses] = useState<Record<string, PlantPulse>>({})

  const trigger = useCallback((studentId: string, type: GrowthPointType) => {
    setPulses((previous) => ({
      ...previous,
      [studentId]: {
        direction: type === 'merit' ? 'grow' : 'shrink',
        token: (previous[studentId]?.token ?? 0) + 1,
      },
    }))
  }, [])

  const pulseFor = useCallback((studentId: string): PlantPulse | null => pulses[studentId] ?? null, [pulses])

  return { pulseFor, trigger }
}
