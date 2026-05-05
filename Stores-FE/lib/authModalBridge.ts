/** Lets non-React code (e.g. axios interceptors) open the global auth modal. */

export type AuthModalBridgeMode = 'login' | 'signup' | 'auto'

let openFn: ((mode?: AuthModalBridgeMode) => void) | null = null

/** Called once from `AuthModalProvider` when it mounts. */
export function registerAuthModalOpener(fn: (mode?: AuthModalBridgeMode) => void) {
  openFn = fn
  return () => {
    openFn = null
  }
}

/** Fire-and-forget; prefer `tryOpenAuthModalFromBridge` when you need success/failure. */
export function openAuthModalFromBridge(mode: AuthModalBridgeMode = 'login') {
  tryOpenAuthModalFromBridge(mode)
}

/**
 * Opens the auth modal if the provider has registered and the opener does not throw.
 * @returns true if the modal was triggered, false if unavailable or opener threw.
 */
export function tryOpenAuthModalFromBridge(mode: AuthModalBridgeMode = 'login'): boolean {
  if (!openFn) return false
  try {
    openFn(mode)
    return true
  } catch {
    return false
  }
}

export function isAuthModalBridgeRegistered() {
  return openFn != null
}
