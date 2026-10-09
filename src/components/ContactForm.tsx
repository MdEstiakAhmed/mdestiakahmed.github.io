import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  email: z.email('Please enter a valid email'),
  message: z.string().trim().min(10, 'Tell me a bit more (10+ characters)').max(5000),
});

type FormValues = z.infer<typeof schema>;

// Tiny zod resolver; @hookform/resolvers' peer range lags zod v4.
const zodResolver: Resolver<FormValues> = async (values) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    errors[key] ??= { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

type Status = { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string };

interface Props {
  action: string;
}

const inputClass =
  'w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive';

export default function ContactForm({ action }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setStatus({ kind: 'idle' });
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      reset();
      setStatus({ kind: 'success' });
    } catch {
      setStatus({ kind: 'error', message: 'Something went wrong. Please email me directly.' });
    }
  };

  const fields = [
    { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  ] as const;

  return (
    <form
      action={action}
      method="POST"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-card space-y-5 rounded-2xl border p-6"
    >
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
            className={inputClass}
            {...register(f.name)}
          />
          {errors[f.name] && (
            <p id={`${f.name}-error`} className="text-destructive text-xs">
              {errors[f.name]?.message}
            </p>
          )}
        </div>
      ))}
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={cn(inputClass, 'resize-y')}
          {...register('message')}
        />
        {errors.message && (
          <p id="message-error" className="text-destructive text-xs">
            {errors.message.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm">
        {status.kind === 'success' && (
          <span className="text-emerald-600 dark:text-emerald-400">
            Thanks! I'll get back to you soon.
          </span>
        )}
        {status.kind === 'error' && <span className="text-destructive">{status.message}</span>}
      </p>
    </form>
  );
}
