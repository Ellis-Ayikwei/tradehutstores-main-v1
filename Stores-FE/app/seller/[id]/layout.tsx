import MainLayout from '@/components/Layouts/MainLayout'

export const runtime = 'edge'

export default function SellerStorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <MainLayout>
            <div className="min-h-[60vh] bg-gray-50 pb-4 dark:bg-gray-950">{children}</div>
        </MainLayout>
    )
}
