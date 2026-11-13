/**
 * Device identity sent with sign-in requests, in the field names Stores-BE already reads
 * (`device_id`, `device_name`, `fingerprint`, `device_info`).
 *
 * - `device_id`: random id kept in localStorage, so it survives until site data is cleared.
 * - `fingerprint`: SHA-256 of stable browser and hardware signals. It is the same across
 *   sessions on one browser, but two identical phones on the same browser version can share it,
 *   which is why the backend matches on device_id and fingerprint together.
 *
 * The raw signals never leave the browser, only their hash. Browser-only: do not call on the server.
 */

export interface DeviceIdentity {
    device_id: string
    device_name: string
    fingerprint: string
    device_info: { user_agent: string; language: string; timezone: string; screen: string }
}

const DEVICE_ID_KEY = 'th_device_id'

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

/** In-memory fallback so a browser with storage blocked still sends one id per page load. */
let memoryDeviceId: string | null = null

function deviceId(): string {
    try {
        const stored = localStorage.getItem(DEVICE_ID_KEY)
        if (stored) return stored
    } catch {
        // Storage blocked (private mode, site data disabled): fall through to the in-memory id.
    }
    memoryDeviceId ??= hex(crypto.getRandomValues(new Uint8Array(16)))
    try {
        localStorage.setItem(DEVICE_ID_KEY, memoryDeviceId)
    } catch {
        // Same as above.
    }
    return memoryDeviceId
}

/** "Chrome on Windows" style label for the user's device list. Order matters: Edge and Opera also say Chrome. */
function deviceName(ua: string): string {
    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /OPR\//.test(ua)
          ? 'Opera'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Chrome\//.test(ua)
              ? 'Chrome'
              : /Safari\//.test(ua)
                ? 'Safari'
                : 'Browser'
    const os = /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(ua)
          ? 'iOS'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Mac OS X/.test(ua)
              ? 'macOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'unknown device'
    return `${browser} on ${os}`
}

let cached: Promise<DeviceIdentity | null> | null = null

/**
 * Resolves to null where hashing is unavailable (`crypto.subtle` only exists on https and
 * localhost); callers then send no device fields rather than a weak one.
 */
export function getDeviceIdentity(): Promise<DeviceIdentity | null> {
    cached ??= (async () => {
        if (typeof window === 'undefined' || !window.crypto?.subtle) return null
        const nav = navigator as Navigator & { deviceMemory?: number }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const screenSize = `${screen.width}x${screen.height}x${screen.colorDepth}`
        const signals = [
            nav.userAgent,
            nav.languages?.join(',') ?? nav.language,
            nav.platform,
            nav.hardwareConcurrency,
            nav.deviceMemory,
            nav.maxTouchPoints,
            screenSize,
            window.devicePixelRatio,
            timezone,
        ].join('|')
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signals))
        return {
            device_id: deviceId(),
            device_name: deviceName(nav.userAgent),
            fingerprint: hex(new Uint8Array(digest)),
            device_info: { user_agent: nav.userAgent, language: nav.language, timezone, screen: screenSize },
        }
    })().catch(() => null)
    return cached
}
