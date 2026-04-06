import { FileText, TriangleAlert } from 'lucide-react';
import { Button } from '@librechat/client';
import { cn } from '~/utils';

type SkillStateVariant = 'empty' | 'error';

interface SkillStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: SkillStateVariant;
  className?: string;
}

const stateStyles: Record<SkillStateVariant, { iconClassName: string; iconWrapClassName: string }> =
  {
    empty: {
      iconClassName: 'text-text-secondary',
      iconWrapClassName: 'bg-surface-tertiary',
    },
    error: {
      iconClassName: 'text-amber-500',
      iconWrapClassName: 'bg-amber-500/10',
    },
  };

export default function SkillState({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'empty',
  className = '',
}: SkillStateProps) {
  const Icon = variant === 'error' ? TriangleAlert : FileText;
  const styles = stateStyles[variant];

  return (
    <div
      className={cn('flex min-h-[280px] w-full items-center justify-center px-4 py-8', className)}
    >
      <div className="flex w-full max-w-lg flex-col items-center rounded-2xl border border-border-light bg-transparent p-6 text-center">
        <div
          className={cn(
            'mb-3 flex size-11 items-center justify-center rounded-full',
            styles.iconWrapClassName,
          )}
        >
          <Icon className={cn('size-5', styles.iconClassName)} aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-text-primary">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-text-secondary">{description}</p>
        {actionLabel && onAction && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            aria-label={actionLabel}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
