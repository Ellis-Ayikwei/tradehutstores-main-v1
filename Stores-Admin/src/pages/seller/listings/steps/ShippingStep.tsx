import { useFormContext } from 'react-hook-form';
import { Card } from '@/components/shadcn/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Switch } from '@/components/shadcn/switch';
import type { ListingFormValues } from '../schema';

export function ShippingStep() {
    const { control } = useFormContext<ListingFormValues>();

    return (
        <div className="space-y-3">
            <Card className="p-3">
                <FormField
                    control={control}
                    name="free_shipping"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
                            <div className="space-y-0.5">
                                <FormLabel>Free shipping</FormLabel>
                                <FormDescription>Buyers see a free shipping label and pay no delivery fee when every item in your order has it on.</FormDescription>
                                <FormMessage />
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Free shipping" />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </Card>
            <p className="text-sm text-muted-foreground">Delivery methods and rates come from the store shipping settings. Weight and dimensions are not collected yet.</p>
        </div>
    );
}
