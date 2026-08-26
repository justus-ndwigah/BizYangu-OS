import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  // design note
  // Whitespace-nowrap: Badges should never wrap.
  'whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2' +
    ' hover-elevate ',
  {
    variants: {
      variant: {
        default:
          // design note: shadow-xs instead of shadow, no hover because we use hover-elevate
          'border-transparent bg-primary text-primary-foreground shadow-xs',
        secondary:
          // design note: no hover because we use hover-elevate
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          // design note: shadow-xs instead of shadow, no hover because we use hover-elevate
          'border-transparent bg-destructive text-destructive-foreground shadow-xs',
        // design note: shadow-xs" - use badge outline variable
        outline: 'text-foreground border [border-color:var(--badge-outline)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
