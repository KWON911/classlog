import type { DecorationType } from '../../lib/types'

type GardenDecorationProps = {
  type: DecorationType
}

/**
 * 공동 목표로 해금하는 정원 소품. 외부 이미지를 쓰지 않아 어떤 화면에서도 같은
 * 따뜻한 선·색감으로 그려지고, 레이어 쪽에서만 위치와 크기를 정한다.
 */
export function GardenDecoration({ type }: GardenDecorationProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full" style={{ overflow: 'visible' }}>
      {type === 'stone_path' && <StonePath />}
      {type === 'bench' && <Bench />}
      {type === 'pond' && <Pond />}
      {type === 'birdhouse' && <Birdhouse />}
      {type === 'big_tree' && <BigTree />}
      {type === 'bridge' && <Bridge />}
      {type === 'fence' && <Fence />}
      {type === 'garden_lamp' && <GardenLamp />}
    </svg>
  )
}

function StonePath() {
  return <path d="M12 101 C33 78 44 79 60 61 C76 43 91 37 110 18" fill="none" stroke="#bca78b" strokeWidth="20" strokeLinecap="round" strokeDasharray="13 7" opacity="0.86" />
}

function Bench() {
  return <g stroke="#875c3a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 45 H98 V64 H22 Z" fill="#d4975b" /><path d="M26 70 H94" /><path d="M34 64 L27 94 M86 64 L93 94" /><path d="M18 34 H102 V46 H18 Z" fill="#edbc79" /></g>
}

function Pond() {
  return <g><ellipse cx="60" cy="68" rx="51" ry="32" fill="#79c5d8" stroke="#4e9eb4" strokeWidth="5" /><ellipse cx="60" cy="65" rx="36" ry="17" fill="#bfe9ed" opacity="0.78" /><path d="M27 83 Q38 66 48 84 M70 82 Q81 64 93 82" fill="none" stroke="#f7fff8" strokeWidth="4" strokeLinecap="round" /><path d="M18 50 Q24 39 32 47 M86 46 Q95 35 102 49" fill="none" stroke="#6fa457" strokeWidth="7" strokeLinecap="round" /></g>
}

function Birdhouse() {
  return <g stroke="#7a573b" strokeWidth="5" strokeLinejoin="round"><path d="M56 54 V111 H69 V54" fill="#9e6b43" /><path d="M24 52 L60 20 L96 52 V88 H24 Z" fill="#efb36e" /><path d="M18 53 L60 13 L102 53 Z" fill="#cc7b58" /><circle cx="60" cy="59" r="13" fill="#573f30" stroke="none" /><path d="M80 38 H105" strokeLinecap="round" /></g>
}

function BigTree() {
  return <g strokeLinecap="round" strokeLinejoin="round"><path d="M55 64 L42 111 H81 L67 64" fill="#8d643e" stroke="#6f4d33" strokeWidth="5" /><path d="M61 68 V42 M58 86 L35 63 M66 84 L89 58" fill="none" stroke="#6f4d33" strokeWidth="5" /><circle cx="39" cy="43" r="25" fill="#82b968" stroke="#568e50" strokeWidth="5" /><circle cx="66" cy="29" r="29" fill="#9aca72" stroke="#568e50" strokeWidth="5" /><circle cx="87" cy="49" r="24" fill="#75ad62" stroke="#568e50" strokeWidth="5" /><circle cx="57" cy="49" r="8" fill="#d6ee9a" opacity="0.7" /></g>
}

function Bridge() {
  return <g stroke="#8a5d3b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 87 Q60 28 108 87" fill="none" strokeWidth="15" /><path d="M16 86 Q60 42 104 86" fill="none" stroke="#d69758" strokeWidth="10" /><path d="M24 68 V96 M47 46 V75 M73 46 V75 M96 68 V96" fill="none" /></g>
}

function Fence() {
  return <g stroke="#926b46" strokeWidth="5" strokeLinejoin="round"><path d="M9 59 H111 V78 H9 Z" fill="#efc486" /><path d="M24 25 L38 42 V102 H10 V42 Z M82 25 L110 42 V102 H82 Z" fill="#f4d39d" /><path d="M15 66 H105" /></g>
}

function GardenLamp() {
  return <g stroke="#73533c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M60 51 V111" /><path d="M43 109 H77" /><path d="M45 48 H75 L69 18 H51 Z" fill="#ffd979" /><path d="M42 50 H78" /><path d="M50 18 H70" /><circle cx="60" cy="35" r="9" fill="#fff4bb" stroke="none" /></g>
}
