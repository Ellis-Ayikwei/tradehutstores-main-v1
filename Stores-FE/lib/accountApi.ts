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
    address_id: number | string | null
    /** The delivery address itself; null when the order has none (or it was deleted). */
    shipping_address?: {
        full_name?: string | null
        phone?: string | null
        address?: string | null
        address_line2?: string | null
        city?: string | null
        state?: string | null
        postal_code?: string | null
        country?: string | null
    } | null
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

/** Notification JSON (contract 25-notifications). `link` is a storefront-relative path or "". */
export type ApiNotification = {
    id: string | number
    kind: string
    title: string
    body: string
    link: string
    data: Record<string, unknown>
    is_read: boolean
    read_at: string | null
    created_at: string
}

export type NotificationPage = {
    count: number
    next: string | null
    previous: string | null
    results: ApiNotification[]
}

export type ListNotificationsParams = {
    page?: number
    pageSize?: number
    unread?: boolean
    /** kind prefix, e.g. "auction" */
    kind?: string
}

/** GET notifications/ */
export async function listNotifications(params: ListNotificationsParams = {}): Promise<NotificationPage> {
    const query: Record<string, string | number> = {}
    if (params.page) query.page = params.page
    if (params.pageSize) query.page_size = params.pageSize
    if (params.unread) query.unread = 'true'
    if (params.kind) query.kind = params.kind
    const { data } = await axiosInstance.get<NotificationPage>(`notifications/`, { params: query })
    return data
}

/** POST notifications/{id}/read/ (idempotent) */
export async function markNotificationRead(id: string | number): Promise<ApiNotification> {
    const { data } = await axiosInstance.post<ApiNotification>(`notifications/${id}/read/`)
    return data
}

/** POST notifications/read-all/ */
export async function markAllNotificationsRead(): Promise<number> {
    const { data } = await axiosInstance.post<{ updated?: number }>(`notifications/read-all/`)
    return typeof data?.updated === 'number' ? data.updated : 0
}

/** DELETE notifications/{id}/ */
export async function deleteNotification(id: string | number): Promise<void> {
    await axiosInstance.delete(`notifications/${id}/`)
}
