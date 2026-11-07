import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// `mb-0 inline-block font-medium` neutralises the legacy global `label { mb-1.5 block font-semibold }` rule.
const labelVariants = cva('mb-0 inline-block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground');

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
