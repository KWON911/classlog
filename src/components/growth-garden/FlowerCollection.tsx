import type { PlantCycle } from '../../lib/types'
import type { PlantCycleSummary } from '../../lib/growth-garden/plantCycle'
import { PlantIllustration } from './PlantIllustration'

export function FlowerCollection({ cycles, current }: { cycles: PlantCycle[]; current: PlantCycleSummary }) {
  return (
    <section className="mt-4 w-full border-t border-gray-100 pt-4">
      <h2 className="text-sm font-semibold text-gray-900">나의 꽃 기록</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="w-20 rounded-xl bg-brand-50 p-1.5 text-center">
            <PlantIllustration stage={6} flowerType={cycle.flower_type} variant="ground" className="mx-auto h-12 w-full" />
            <p className="text-[11px] font-semibold text-gray-700">{cycle.cycle_number}번째 성장</p>
          </div>
        ))}
        <div className="w-20 rounded-xl border border-dashed border-brand-200 p-1.5 text-center">
          <PlantIllustration stage={current.currentStage} studentId="current" variant="ground" className="mx-auto h-12 w-full" />
          <p className="text-[11px] font-semibold text-gray-500">현재 진행 중</p>
        </div>
      </div>
    </section>
  )
}
