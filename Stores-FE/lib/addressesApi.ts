import axios from 'axios'
import axiosInstance from '@/lib/axiosInstance'

/**
 * Saved delivery addresses. Wraps the DRF `AddressViewSet` mounted at `addresses/`
 * (Stores-BE/apps/users/address_urls.py + address_views.py):
 *   GET/POST addresses/ · GET/PATCH/DELETE addresses/<id>/ · POST addresses/<id>/set_default/
 * The first address a user creates becomes their default on the server.
 */

export interface Address {
    id: string
    label: string | null
    full_name: string | null
    phone: string | null
    is_default: boolean
    address: string
    address_line2: string | null
    city: string
    state: string | null
    postal_code: string
    country: string
}

export interface AddressInput {
    label?: string
    full_name: string
    phone: string
    address: string
    address_line2?: string
    city: string
    state?: string
    postal_code: string
    country: string
    is_default?: boolean
}

export class AddressApiError extends Error {
    status: number
    /** DRF field errors, first message per field. */
    fieldErrors: Record<string, string>
    isNetwork: boolean

    constructor(message: string, status: number, fieldErrors: Record<string, string>, isNetwork: boolean) {
        super(message)
        this.name = 'AddressApiError'
        this.status = status
        this.fieldErrors = fieldErrors
        this.isNetwork = isNetwork
    }
}

function toAddressError(err: unknown): AddressApiError {
    if (err instanceof AddressApiError) return err
    if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0
        const body = err.response?.data
        const fieldErrors: Record<string, string> = {}
        let message = err.message
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
                const first = Array.isArray(value) ? value[0] : value
                if (typeof first !== 'string') continue
                if (key === 'detail' || key === 'non_field_errors') message = first
                else fieldErrors[key] = first
            }
        }
        return new AddressApiError(message, status, fieldErrors, !err.response)
    }
    return new AddressApiError(err instanceof Error ? err.message : 'Unknown error', 0, {}, true)
}

function asList(data: unknown): Address[] {
    if (Array.isArray(data)) return data as Address[]
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
        return (data as { results: Address[] }).results
    }
    return []
}

export async function listAddresses(): Promise<Address[]> {
    try {
        const res = await axiosInstance.get<unknown>('addresses/')
        return asList(res.data)
    } catch (err) {
        throw toAddressError(err)
    }
}

export async function createAddress(input: AddressInput): Promise<Address> {
    try {
        const res = await axiosInstance.post<Address>('addresses/', input)
        return res.data
    } catch (err) {
        throw toAddressError(err)
    }
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
    try {
        const res = await axiosInstance.patch<Address>(`addresses/${encodeURIComponent(id)}/`, input)
        return res.data
    } catch (err) {
        throw toAddressError(err)
    }
}

export async function deleteAddress(id: string): Promise<void> {
    try {
        await axiosInstance.delete(`addresses/${encodeURIComponent(id)}/`)
    } catch (err) {
        throw toAddressError(err)
    }
}

export async function setDefaultAddress(id: string): Promise<Address> {
    try {
        const res = await axiosInstance.post<Address>(`addresses/${encodeURIComponent(id)}/set_default/`, {})
        return res.data
    } catch (err) {
        throw toAddressError(err)
    }
}

/** One-line summary used in collapsed checkout sections. */
export function addressOneLine(a: Address): string {
    return [a.full_name, a.address, a.city, a.state].filter((p): p is string => Boolean(p && p.trim())).join(', ')
}
