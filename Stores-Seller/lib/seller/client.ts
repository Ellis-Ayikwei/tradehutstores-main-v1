import type { AxiosRequestConfig } from 'axios'
import axiosInstance from '@/lib/axiosInstance'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { toSellerError } from './errors'

/**
 * Seller Central API helpers. They sit on the storefront's authenticated axios instance
 * (`lib/axiosInstance`: Bearer token from the auth cookie, one refresh retry on 401), so
 * token handling lives in one place. Base URL is `NEXT_PUBLIC_API_URL`; pass paths like `sellers/me/`.
 *
 * Behaviour:
 *  - resolve with the response body (`data`),
 *  - on failure throw the raw axios error after side effects; map it with `toSellerError(e)`
 *    from `./errors`,
 *  - a 401 that survives the refresh retry (session gone) opens the sign-in modal.
 *
 * Writes that can be retried (checkout, payouts) take an `Idempotency-Key` header:
 * `sellerPost(url, body, { headers: { 'Idempotency-Key': crypto.randomUUID() } })`.
 */

export type SellerRequestConfig = Pick<AxiosRequestConfig, 'headers' | 'signal' | 'timeout'>

type Params = Record<string, string | number | boolean | null | undefined>

function cleanParams(params?: Params): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined
    const out: Record<string, string | number | boolean> = {}
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') out[k] = v
    }
    return out
}

async function run<T>(request: () => Promise<{ data: T }>): Promise<T> {
    try {
        const res = await request()
        return res.data
    } catch (e) {
        if (toSellerError(e).status === 401 && typeof window !== 'undefined') {
            tryOpenAuthModalFromBridge('login')
        }
        throw e
    }
}

export function sellerGet<T>(url: string, params?: Params, config?: SellerRequestConfig): Promise<T> {
    return run<T>(() => axiosInstance.get<T>(url, { ...config, params: cleanParams(params) }))
}

export function sellerPost<T>(url: string, body?: unknown, config?: SellerRequestConfig): Promise<T> {
    return run<T>(() => axiosInstance.post<T>(url, body ?? {}, config))
}

export function sellerPatch<T>(url: string, body?: unknown, config?: SellerRequestConfig): Promise<T> {
    return run<T>(() => axiosInstance.patch<T>(url, body ?? {}, config))
}

export function sellerDelete<T = void>(url: string, config?: SellerRequestConfig): Promise<T> {
    return run<T>(() => axiosInstance.delete<T>(url, config))
}

export interface SellerUploadOptions extends SellerRequestConfig {
    /** Default `post`. Use `patch` for multipart edits (for example logo/banner on `sellers/me/`). */
    method?: 'post' | 'patch' | 'put'
    /** 0-100 while the request body uploads. */
    onProgress?: (percent: number) => void
}

/**
 * Multipart upload. `body` is a FormData, or a plain object of fields where `File`/`Blob`
 * values are appended as files and everything else as strings.
 */
export function sellerUpload<T>(
    url: string,
    body: FormData | Record<string, string | number | boolean | Blob | null | undefined>,
    options: SellerUploadOptions = {}
): Promise<T> {
    const { method = 'post', onProgress, ...config } = options
    let form: FormData
    if (body instanceof FormData) {
        form = body
    } else {
        form = new FormData()
        for (const [key, value] of Object.entries(body)) {
            if (value === undefined || value === null) continue
            form.append(key, value instanceof Blob ? value : String(value))
        }
    }
    return run<T>(() =>
        axiosInstance.request<T>({
            ...config,
            url,
            method,
            data: form,
            headers: { ...(config.headers ?? {}), 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (event) => {
                      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100))
                  }
                : undefined,
        })
    )
}
