import MainLayout from '@/components/Layouts/MainLayout'
import { AdSlot } from '@/components/Ads'
import HeroWithSearch from '@/components/Home/HeroWithSearch'
import Categories from '@/components/Home/Categories'
import FlashDeals from '@/components/Home/FlashDeals'
import TeaserRows from '@/components/Home/TeaserRows'
import HomeMerchandising from '@/components/Home/HomeMerchandising'
import TrustBar from '@/components/Home/TrustBar'
import RecentlyViewed from '@/components/Home/RecentlyViewed'
import RecommendedGrid from '@/components/Home/RecommendedGrid'
import SellerCta from '@/components/Home/SellerCta'
import { HOME_CONTAINER } from '@/components/Home/HomeSection'

export default function HomePage() {
    return (
        <MainLayout>
            <div className="overflow-x-clip bg-neutral-100 pb-2 dark:bg-neutral-950">
                <HeroWithSearch />
                <Categories />
                <FlashDeals />
                {/* Admin-managed placement; renders nothing when no live ad. */}
                <div className={`${HOME_CONTAINER} mt-4 empty:hidden`}>
                    <AdSlot slug="nav-banner" aspectClass="aspect-[21/5] md:aspect-[21/4]" rounded="rounded-2xl" />
                </div>
                <TeaserRows />
                <HomeMerchandising />
                <TrustBar />
                <RecentlyViewed />
                <RecommendedGrid />
                <SellerCta />
            </div>
        </MainLayout>
    )
}
