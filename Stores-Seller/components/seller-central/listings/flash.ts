/**
 * One-shot message handed from the wizard to the listings table across the navigation
 * (each screen has its own toast stack, so a toast raised just before leaving would be lost).
 */
const FLASH_KEY = 'seller-central:listings:flash'

export function setFlash(message: string): void {
    try {
        window.sessionStorage.setItem(FLASH_KEY, message)
    } catch {
        /* storage unavailable (private mode): the message is simply skipped */
    }
}

export function takeFlash(): string | null {
    try {
        const message = window.sessionStorage.getItem(FLASH_KEY)
        if (message) window.sessionStorage.removeItem(FLASH_KEY)
        return message
    } catch {
        return null
    }
}
