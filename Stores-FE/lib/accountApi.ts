import axiosInstance from '@/lib/axiosInstance'

/** GET users/{id}/profile/ */
export type UserProfileResponse = {
    id: string
    username: string
    email: string
    first_name: string
    last_name: string
    name: string
    is_active: boolean
    is_staff: boolean
    is_superuser: boolean
    groups: { id: number; name: string }[]
    user_type: string
    date_joined: string
    last_login: string | null
}

/** GET users/{id}/my_orders/ — OrderSerializer */
export type ApiOrderItem = {
    id: string
    order: string
    product: string | null
    product_name: string
    quantity: number
    unit_price: string | number
    total_price: string | number
    created_at: string
}

export type ApiOrder = {
    id: string
    user: string | null
    total_amount: string | number
    order_status: string | null
    address_id: number | null
    pay_mode: string
    phone: number | string | null
    estimated_delivery_date: string | null
    items: ApiOrderItem[]
    created_at: string
    updated_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
    const { data } = await axiosInstance.get<UserProfileResponse>(`users/${userId}/profile/`)
    return data
}

export async function getMyOrders(userId: string): Promise<ApiOrder[]> {
    const { data } = await axiosInstance.get<ApiOrder[] | ApiOrder>(`users/${userId}/my_orders/`)
    return Array.isArray(data) ? data : data ? [data] : []
}

export async function getNotificationUnreadCount(): Promise<number> {
    try {
        const { data } = await axiosInstance.get<{ count?: number }>(`notifications/unread_count/`)
        return typeof data?.count === 'number' ? data.count : 0
    } catch {
        return 0
    }
}
