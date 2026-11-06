/** Join truthy class names. Tiny local helper so the primitives need no dependency. */
export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ')
}
