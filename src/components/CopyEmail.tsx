import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  email: string;
  className?: string;
}

/** Big mailto link with a copy-to-clipboard button beside it. */
export default function CopyEmail({ email, className }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a
        href={`mailto:${email}`}
        className="hover:text-primary text-xl font-semibold tracking-tight break-all underline-offset-8 hover:underline sm:text-2xl"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Email copied' : 'Copy email address'}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors',
          copied
            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground hover:border-primary hover:text-primary',
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Email address copied to clipboard' : ''}
      </span>
    </div>
  );
}
