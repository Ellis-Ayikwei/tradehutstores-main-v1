import { Package } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import PdpMessage from './_components/PdpMessage'

export default function ProductNotFound() {
  return (
    <MainLayout>
      <PdpMessage
        icon={<Package className="h-8 w-8" aria-hidden />}
        title="Product not found"
        message="This product does not exist or is no longer available."
      />
    </MainLayout>
  )
}
