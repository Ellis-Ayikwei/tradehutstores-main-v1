import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
        className={cn(
            'peer relative inline-flex h-[18.4px] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-subtle disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
            className
        )}
        {...props}
        ref={ref}
    >
        <SwitchPrimitives.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
