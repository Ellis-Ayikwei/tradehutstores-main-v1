/**
 * Returns `raw` only when it is a same-origin app path (e.g. "/admin/orders?page=2").
 * Anything that a browser or router could treat as leaving the site is rejected:
 * absolute URLs, protocol-relative "//host", backslash variants ("/\host"), or
 * values that fail to decode. Use it for every redirect target that comes from
 * the URL (e.g. the `?from=` query param on the login page).
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let value: string;
    try {
        value = decodeURIComponent(raw).trim();
    } catch {
        return null;
    }
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//') || value.includes('\\')) return null;
    // Reject control characters that some browsers strip before parsing (tab or newline before "//host").
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(value)) return null;
    return value;
}
