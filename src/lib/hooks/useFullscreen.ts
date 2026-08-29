import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * 특정 엘리먼트를 전체화면으로 띄우는 훅.
 *
 * 상태는 브라우저의 `fullscreenchange` 이벤트에서만 갱신한다 — ESC나 브라우저 UI로
 * 빠져나가는 경우까지 한 곳에서 처리하기 위함. 사파리(webkit) 접두사도 함께 본다.
 * 전체화면을 못 쓰는 환경(iOS 사파리 등)에서는 `supported`가 false가 되고,
 * 진입 실패는 조용히 무시한다(오류 화면 대신 그냥 일반 보기가 유지된다).
 */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supported, setSupported] = useState(true)
  /** 진입이 거부됐을 때 화면에 보여줄 안내 (거부 사유는 브라우저마다 달라 문구는 하나로 둔다) */
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const doc = document as FullscreenDocument
    setSupported(Boolean(doc.fullscreenEnabled ?? true))

    function sync() {
      setIsFullscreen(currentFullscreenElement() === ref.current)
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    sync()
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [ref])

  const enter = useCallback(async () => {
    const element = ref.current as FullscreenElement | null
    if (!element) return
    setError(null)
    try {
      if (element.requestFullscreen) await element.requestFullscreen()
      else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen()
      else setSupported(false)
    } catch {
      // 브라우저·환경(정책, 내장 브라우저 등)이 거부한 경우. 일시적인 실패일 수 있어
      // 버튼을 숨기지는 않고(API 자체가 없을 때만 숨긴다) 안내만 남긴다.
      // 화면은 일반 보기 그대로 유지된다.
      setError('이 브라우저에서는 전체화면을 사용할 수 없어요.')
    }
  }, [ref])

  const exit = useCallback(async () => {
    const doc = document as FullscreenDocument
    if (!currentFullscreenElement()) return
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
    } catch {
      // 이미 빠져나온 경우 등 — 무시해도 상태는 fullscreenchange가 맞춰 준다.
    }
  }, [])

  const toggle = useCallback(() => {
    if (isFullscreen) void exit()
    else void enter()
  }, [isFullscreen, enter, exit])

  return { isFullscreen, supported, error, enter, exit, toggle }
}
