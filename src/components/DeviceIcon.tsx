import type { DeviceKind } from '../types'

interface DeviceIconProps {
  kind: DeviceKind
  size?: number
}

export function DeviceIcon({ kind, size = 22 }: DeviceIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
  }

  switch (kind) {
    case 'router':
      return (
        <svg {...common}>
          <rect x="2.5" y="14" width="19" height="6.5" rx="2" />
          <path d="M6.5 17.25h.01M9.5 17.25h.01M16.5 17.25h1.5" />
          <path d="M12 14v-3.5" />
          <path d="M9.5 9.2a3.7 3.7 0 0 1 5 0" />
          <path d="M7.3 6.8a7 7 0 0 1 9.4 0" />
        </svg>
      )
    case 'switch':
      return (
        <svg {...common}>
          <rect x="2.5" y="7.5" width="19" height="8" rx="2" />
          <path d="M6 11.5h.01M8.7 11.5h.01M11.4 11.5h.01M14.1 11.5h.01M16.8 11.5h1.4" />
          <path d="M6.5 15.5v3M17.5 15.5v3" />
          <path d="M8.5 9.7 10 8.2M15.5 9.7 14 8.2" />
        </svg>
      )
    case 'server':
      return (
        <svg {...common}>
          <rect x="3.5" y="2.8" width="17" height="18.4" rx="2.6" />
          <path d="M7 7h10M7 12h10M7 17h10" />
          <path d="M15.6 7h.01M15.6 12h.01M15.6 17h.01" />
          <path d="M5.7 7h.01M5.7 12h.01M5.7 17h.01" />
        </svg>
      )
    case 'nas':
      return (
        <svg {...common}>
          <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
          <path d="M3 9h18M3 15h18" />
          <path d="M7 6.25h.01M7 12.25h.01M7 18.25h.01" />
          <path d="M15 6.25h3M15 12.25h3M15 18.25h3" />
        </svg>
      )
    case 'pc':
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="19" height="12.5" rx="2" />
          <path d="M12 16v4.5M8.5 20.5h7" />
          <path d="M6 7.5h5M6 10h3" />
        </svg>
      )
    case 'laptop':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="11" rx="1.8" />
          <path d="M2 19h20l-2.2-4H4.2L2 19Z" />
          <path d="M9.5 17h5" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M6.4 3.5 9 2.8l2 4.3-2.2 1.6a11.5 11.5 0 0 0 5.5 5.5l1.6-2.2 4.3 2-1 2.6a2 2 0 0 1-2.4 1.3C10.5 16.1 6.7 12.3 5.1 5.9a2 2 0 0 1 1.3-2.4Z" />
          <path d="M15.5 3v3M18.5 3.5l-1.5 2.5" />
        </svg>
      )
    case 'mobile':
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M10.5 5.5h3" />
          <path d="M11 18.5h2" />
        </svg>
      )
    case 'ap':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.2" />
          <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8" />
          <path d="M5.7 5.7a8.9 8.9 0 0 0 0 12.6M18.3 5.7a8.9 8.9 0 0 1 0 12.6" />
        </svg>
      )
    case 'vm':
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="19" height="13" rx="2.2" />
          <path d="M8 21h8M12 16.5V21" />
          <rect x="6" y="6.5" width="4.5" height="4.5" rx="1" />
          <path d="M13 7h4M13 9.5h4M13 12h2.5" />
        </svg>
      )
    case 'container':
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <path d="M7 6v12M12 6v12M17 6v12" />
          <path d="M4 3.5h4M16 3.5h4" />
        </svg>
      )
    case 'isp':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.7" />
          <path d="M3.3 12h17.4" />
          <path d="M12 3.3c2.6 2.6 2.6 14.8 0 17.4M12 3.3c-2.6 2.6-2.6 14.8 0 17.4" />
          <path d="M18 18.5v3M16.5 20h3" />
        </svg>
      )
    case 'ups':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="14" rx="2.2" />
          <path d="M8 18v2M16 18v2M7 20h10" />
          <path d="M12 7.2v5.2M9.6 10h4.8" />
          <path d="M8 14.5h8" />
        </svg>
      )
    case 'usb':
      return (
        <svg {...common}>
          <rect x="8.5" y="7.5" width="7" height="13" rx="1.8" />
          <path d="M10.5 7.5V3.5h3v4" />
          <path d="M8.5 12h7" />
          <path d="M11 16h2" />
          <path d="M18.5 10.5v4a2.5 2.5 0 0 1-2.5 2.5h-.5" />
        </svg>
      )
    case 'printer':
      return (
        <svg {...common}>
          <path d="M7 8V3.5h10V8" />
          <rect x="3" y="8" width="18" height="8" rx="2" />
          <path d="M7 16h10v4.5H7z" />
          <path d="M17 11h.01" />
          <path d="M10.5 18.5h3" />
        </svg>
      )
    case 'nettop':
      return (
        <svg {...common}>
          <rect x="6.5" y="4" width="11" height="13" rx="1.8" />
          <path d="M10 20h4" />
          <path d="M12 17v3" />
          <path d="M9.5 7.5h5M9.5 10h3" />
        </svg>
      )
    case 'sbc':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="12" rx="2" />
          <path d="M7 17v2.5M10 17v2.5M14 17v2.5M17 17v2.5" />
          <rect x="7" y="8" width="5" height="4" rx="0.8" />
          <circle cx="16" cy="9" r="0.8" />
          <circle cx="16" cy="12" r="0.8" />
          <path d="M13.5 9.5h1M13.5 11.5h1" />
        </svg>
      )
    case 'printer3d':
      return (
        <svg {...common}>
          <rect x="4" y="3.5" width="16" height="4.5" rx="1.2" />
          <path d="M6 8v5M18 8v5" />
          <path d="M12 8v4" />
          <path d="M10 12h4" />
          <path d="M7 13h10v5.5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
          <path d="M10 16.5h4" />
        </svg>
      )
    case 'recorder':
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="10" rx="2" />
          <path d="M6 16v2.5M18 16v2.5M5 18.5h14" />
          <circle cx="8" cy="11" r="1.2" />
          <path d="M11 9.5h6M11 12.5h4" />
        </svg>
      )
    case 'ipCamera':
      return (
        <svg {...common}>
          <rect x="7" y="8" width="11" height="8" rx="2" />
          <path d="M18 10.5 21 9v6l-3-1.5Z" />
          <path d="M7 12H4.5a2 2 0 0 0-2 2v2" />
          <circle cx="11.5" cy="12" r="1.5" />
        </svg>
      )
    case 'analogCamera':
      return (
        <svg {...common}>
          <rect x="6.5" y="8" width="11" height="8" rx="2" />
          <path d="M17.5 10.5 21 9v6l-3.5-1.5Z" />
          <path d="M6.5 12H4a1.5 1.5 0 0 0 0 3h1.5" />
          <circle cx="11" cy="12" r="1.5" />
          <path d="M3.5 17.5h4" />
        </svg>
      )
    case 'other':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.2-1.5 2.5" />
          <path d="M12 17h.01" />
        </svg>
      )
  }
}
