import { MessageCircle, School, Shuffle, Timer } from 'lucide-react'
import type { NavIcon } from './navItems'

export type MyApp = {
  name: string
  url: string
  icon: NavIcon
  integration?: 'student-roster'
}

export const MY_APPS: MyApp[] = [
  { name: '학교생활정보', url: 'https://school-life-info.vercel.app/', icon: School },
  { name: '타이머', url: 'https://k-timer-one.vercel.app/', icon: Timer },
  { name: '클래스챗', url: 'https://kwon-classroom-chat.vercel.app/', icon: MessageCircle },
  {
    name: '랜덤뽑기',
    url: 'https://presentation-olive-xi.vercel.app/',
    icon: Shuffle,
    integration: 'student-roster',
  },
]
