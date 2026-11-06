import { useFormContext } from 'react-hook-form';
import useSWR from 'swr';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Textarea } from '@/components/shadcn/textarea';
import { CONDITIONS, fetchBrands, fetchCategories, fetchSubcategories } from '@/services/sellerListingsService';
import type { ListingFormValues } from '../schema';

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

export function DetailsStep() {
    const { control, watch, setValue } = useFormContext<ListingFormValues>();
    const category = watch('category');

    const categories = useSWR('catalog:categories', fetchCategories, SWR_OPTIONS);
    const subcategories = useSWR(category ? ['catalog:subcategories', category] : null, () => fetchSubcategories(category), SWR_OPTIONS);
    const brands = useSWR(category ? ['catalog:brands', category] : null, () => fetchBrands(category), SWR_OPTIONS);

    const catalogFailed = categories.error || subcategories.error || brands.error;

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
                control={control}
                name="name"
                render={({ field }) => (
                    <FormItem className="space-y-1.5 sm:col-span-2">
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input {...field} maxLength={255} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="description"
                render={({ field }) => (
                    <FormItem className="space-y-1.5 sm:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea {...field} rows={5} maxLength={5000} />
                        </FormControl>
                        <FormDescription>What buyers should know: materials, what is in the box, size and fit.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="category"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <FormLabel>Category</FormLabel>
                        <Select
                            value={field.value}
                            onValueChange={(v) => {
                                field.onChange(v);
                                setValue('sub_category', '', { shouldDirty: true });
                                setValue('brand', '', { shouldDirty: true });
                            }}
                        >
                            <FormControl>
                                <SelectTrigger ref={field.ref} disabled={categories.isLoading}>
                                    <SelectValue placeholder={categories.isLoading ? 'Loading...' : 'Choose a category'} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {(categories.data ?? []).map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="sub_category"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <FormLabel>Subcategory</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!category || subcategories.isLoading}>
                            <FormControl>
                                <SelectTrigger ref={field.ref}>
                                    <SelectValue placeholder={!category ? 'Choose a category first' : subcategories.isLoading ? 'Loading...' : 'Choose a subcategory'} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {(subcategories.data ?? []).map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="brand"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <FormLabel>Brand</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!category || brands.isLoading}>
                            <FormControl>
                                <SelectTrigger ref={field.ref}>
                                    <SelectValue placeholder={!category ? 'Choose a category first' : brands.isLoading ? 'Loading...' : 'Choose a brand'} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {(brands.data ?? []).map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {category && !brands.isLoading && !brands.error && (brands.data ?? []).length === 0 ? <FormDescription>No brands are set up for this category yet.</FormDescription> : null}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="condition"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <FormLabel>Condition</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                                <SelectTrigger ref={field.ref}>
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {CONDITIONS.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="keywords"
                render={({ field }) => (
                    <FormItem className="space-y-1.5 sm:col-span-2">
                        <FormLabel>Search keywords (optional)</FormLabel>
                        <FormControl>
                            <Input {...field} maxLength={255} autoComplete="off" />
                        </FormControl>
                        <FormDescription>Comma-separated words buyers might search for. Leave blank to use the title.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {catalogFailed ? (
                <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">
                    Could not load categories, subcategories or brands. Check your connection and reopen this step.
                </p>
            ) : null}
        </div>
    );
}
