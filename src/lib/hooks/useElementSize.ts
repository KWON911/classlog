import { useEffect, useState, type RefObject } from 'react'

export type ElementSize = { width: number; height: number }

/**
 * 엘리먼트의 실제 크기를 추적한다(ResizeObserver).
 * 전체화면 전환·창 크기 변경·사이드바 접힘까지 한 경로로 잡히므로,
 * 정원 레이아웃 계산이 항상 지금 화면 크기를 기준으로 돌아간다.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // jsdom 등 ResizeObserver가 없는 환경에서도 컴포넌트가 죽지 않게 한다.
    if (typeof ResizeObserver === 'undefined') {
      setSize({ width: element.clientWidth, height: element.clientHeight })
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((previous) =>
        Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1
          ? previous
          : { width, height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
