import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setPageTitle } from '@/store/themeConfigSlice';
import ListingWizard from './ListingWizard';
import ListingsTable from './ListingsTable';

/**
 * One route (`/seller/listings`) with three views, chosen by query string so no extra routes are needed:
 *   (none)                  listings table
 *   ?mode=new               create wizard
 *   ?mode=edit&id=<uuid>    edit wizard
 */
export default function SellerListings() {
    const dispatch = useDispatch();
    const [params] = useSearchParams();
    const mode = params.get('mode');
    const id = params.get('id');

    const view = mode === 'new' ? 'new' : mode === 'edit' && id ? 'edit' : 'list';

    useEffect(() => {
        dispatch(setPageTitle(view === 'new' ? 'New listing' : view === 'edit' ? 'Edit listing' : 'Listings'));
    }, [dispatch, view]);

    if (view === 'new') return <ListingWizard key="new" />;
    if (view === 'edit' && id) return <ListingWizard key={id} productId={id} />;
    return <ListingsTable />;
}
