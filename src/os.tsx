import type { CSSProperties } from 'react'

export interface OsPreset {
  id: string
  label: string
  keywords: string[]
}

export const OS_PRESETS: OsPreset[] = [
  { id: 'windows', label: 'Windows', keywords: ['windows', 'win'] },
  { id: 'ubuntu', label: 'Ubuntu', keywords: ['ubuntu'] },
  { id: 'debian', label: 'Debian', keywords: ['debian'] },
  { id: 'arch', label: 'Arch', keywords: ['arch'] },
  { id: 'fedora', label: 'Fedora', keywords: ['fedora'] },
  { id: 'macos', label: 'macOS', keywords: ['macos', 'mac os', 'osx', 'darwin'] },
  { id: 'proxmox', label: 'Proxmox', keywords: ['proxmox', 'pve'] },
  { id: 'truenas', label: 'TrueNAS', keywords: ['truenas', 'freenas'] },
  { id: 'centos', label: 'CentOS', keywords: ['centos', 'rocky', 'alma'] },
  { id: 'opensuse', label: 'openSUSE', keywords: ['opensuse', 'suse'] },
  { id: 'android', label: 'Android', keywords: ['android'] },
  { id: 'ios', label: 'iOS', keywords: ['ios', 'iphone os', 'ipados'] },
  { id: 'linux', label: 'Linux', keywords: ['linux'] },
]

export const MOBILE_OS_PRESETS = OS_PRESETS.filter(
  (preset) => preset.id === 'android' || preset.id === 'ios',
)

export function getOsPreset(name?: string): OsPreset | undefined {
  const value = name?.trim().toLowerCase()
  if (!value) return undefined
  for (const preset of OS_PRESETS) {
    if (preset.keywords.some((k) => value.includes(k))) return preset
  }
  return undefined
}

export function OsIcon({
  os,
  size = 14,
}: {
  os?: string
  size?: number
}) {
  const preset = getOsPreset(os)
  if (!preset) return null
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
    focusable: 'false' as const,
    style: { flex: '0 0 auto' } as CSSProperties,
  }

  switch (preset.id) {
    case 'windows':
      return (
        <svg {...common}>
          <rect x="2" y="2" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
          <rect x="12.5" y="2" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
          <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
          <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
        </svg>
      )
    case 'ubuntu':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#E95420" />
          <circle cx="12" cy="5.5" r="1.7" fill="#fff" />
          <circle cx="6.3" cy="15.3" r="1.7" fill="#fff" />
          <circle cx="17.7" cy="15.3" r="1.7" fill="#fff" />
          <circle
            cx="12"
            cy="12"
            r="4.3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
          />
        </svg>
      )
    case 'debian':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#D70A53" />
          <path
            d="M14.4 6.4c-2.1 0-3.8 1.7-3.8 3.8 0 1.3.7 2.5 1.8 3.2-1.9.4-3.5 1.6-4.2 3.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="15.5" cy="7.2" r="1" fill="#fff" />
        </svg>
      )
    case 'arch':
      return (
        <svg {...common}>
          <path d="M12 3 4 20h3.2l1.2-3h7.2l1.2 3H20L12 3Z" fill="#1793D1" />
          <path d="M12 8.2 9.8 13.8h4.4L12 8.2Z" fill="#fff" />
        </svg>
      )
    case 'fedora':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#3C6EB4" />
          <path
            d="M9 15V9.8A2.8 2.8 0 0 1 11.8 7H15v2.2h-2.8c-.4 0-.7.3-.7.7V11h3v2.2h-3V15H9Z"
            fill="#fff"
          />
        </svg>
      )
    case 'macos':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="#111827" />
          <path
            d="M15.5 12.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5-.5 0-1.2-.5-2-.5-1 0-2 .6-2.5 1.5-1.1 1.8-.3 4.6.8 6.1.5.7 1.1 1.6 1.9 1.5.8 0 1.1-.5 2-.5s1.2.5 2 .5c.8 0 1.4-.8 1.9-1.5.6-.8.8-1.7.8-1.7-.1 0-1.7-.7-1.7-2.4Zm-1.3-4.7c.4-.5.7-1.3.6-2-.6 0-1.4.4-1.9 1-.4.5-.7 1.2-.6 1.9.7.1 1.4-.3 1.9-.9Z"
            fill="#fff"
          />
        </svg>
      )
    case 'proxmox':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#1f2937" />
          <path d="M6 7 12 12 6 17V7Zm12 0-6 5 6 5V7Z" fill="#E57000" />
        </svg>
      )
    case 'truenas':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#0095D5" />
          <path
            d="M12 5 6 8v8l6 3 6-3V8l-6-3Zm0 1.8 4 2-4 2-4-2 4-2Zm-4.2 3.4 3.3 1.7v4.4l-3.3-1.7v-4.4Zm8.4 0v4.4l-3.3 1.7v-4.4l3.3-1.7Z"
            fill="#fff"
          />
        </svg>
      )
    case 'centos':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#262577" />
          <path d="M12 5v7l5-2-5-5Zm0 7v7l5-5-5-2Zm0 0H5l5 2-5-5v3Zm0 0h7l-5 2 5 5v-7Z" fill="#932279" />
          <path d="M12 5 7 7l5 5V5Zm0 7-5 5 5 2v-7Zm0 0 5-5v3l-5 2Zm0 0-7 2 2-2h5Z" fill="#EFA724" />
        </svg>
      )
    case 'opensuse':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#73BA25" />
          <path
            d="M7 13.2c1 2 3.2 3 5.6 2.4 2.1-.5 3.4-2.2 3.4-4.2 0-.8-.2-1.5-.6-2.2"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="14.8" cy="9.2" r="1.3" fill="#fff" />
        </svg>
      )
    case 'android':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="11" rx="3" fill="#3DDC84" />
          <path d="M7 8a5 5 0 0 1 10 0" fill="#3DDC84" />
          <circle cx="9" cy="12" r="1" fill="#fff" />
          <circle cx="15" cy="12" r="1" fill="#fff" />
          <path
            d="M8 7 6.5 4.5M16 7l1.5-2.5"
            stroke="#3DDC84"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'ios':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="#111827" />
          <path
            d="M15.4 12.5c0-1.4 1.2-2.1 1.2-2.1-.7-1-1.7-1.1-2.1-1.1-.9-.1-1.7.5-2.1.5-.5 0-1.2-.5-1.9-.5-1 0-1.9.6-2.4 1.4-1 1.7-.3 4.3.7 5.7.5.7 1 1.4 1.8 1.4.7 0 1-.4 1.9-.4s1.1.4 1.9.4c.8 0 1.3-.7 1.8-1.4.5-.8.8-1.5.8-1.6-.1 0-1.6-.6-1.6-2.3Z"
            fill="#fff"
          />
        </svg>
      )
    case 'linux':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="#111827" />
          <path
            d="M12 6.2c-1.7 0-2.8 1.4-2.8 3.4 0 .9.2 1.6.6 2.2-1.2.8-2 2.2-2 3.6 0 1.9 1.8 3 4.2 3s4.2-1.1 4.2-3c0-1.4-.8-2.8-2-3.6.4-.6.6-1.3.6-2.2 0-2-1.1-3.4-2.8-3.4Z"
            fill="#FACC15"
          />
          <circle cx="10.8" cy="9" r="0.6" fill="#111827" />
          <circle cx="13.2" cy="9" r="0.6" fill="#111827" />
          <path d="M12 10.3c.6 0 1 .3 1.2.8-.4.1-.8.2-1.2.2s-.8-.1-1.2-.2c.2-.5.6-.8 1.2-.8Z" fill="#F97316" />
        </svg>
      )
    default:
      return null
  }
}
