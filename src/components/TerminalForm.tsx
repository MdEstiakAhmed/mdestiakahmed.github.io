import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';

const fields = {
  name: z.string().trim().min(2, 'name: too short, try at least 2 characters'),
  email: z.email('email: that does not look like a valid address'),
  message: z
    .string()
    .trim()
    .min(10, 'message: tell me a bit more (10+ characters)')
    .max(5000, 'message: keep it under 5000 characters'),
} as const;

type Field = keyof typeof fields;
const steps: { field: Field; prompt: string; type: 'text' | 'email' | 'textarea' }[] = [
  { field: 'name', prompt: "What's your name?", type: 'text' },
  { field: 'email', prompt: 'Where can I reach you?', type: 'email' },
  {
    field: 'message',
    prompt: 'What are you building? (Shift+Enter for a new line)',
    type: 'textarea',
  },
];

type Line = { kind: 'prompt' | 'answer' | 'error' | 'ok' | 'muted'; text: string };
type Phase = 'input' | 'sending' | 'sent' | 'failed';

interface Props {
  action: string;
  /** Fallback address shown when sending fails. */
  email: string;
}

const PS1 = (
  <span className="text-emerald-500 dark:text-emerald-400">
    guest@estiak.me<span className="text-muted-foreground">:</span>
    <span className="text-primary">~</span>
    <span className="text-muted-foreground">$</span>
  </span>
);

/** The contact form as a shell session: one question per line, validated as you go. */
export default function TerminalForm({ action, email }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', message: '' });
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<Line[]>([]);
  const [phase, setPhase] = useState<Phase>('input');
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  const current = steps[step];

  // Keep the newest line in view; move focus only once the visitor has engaged.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    if (touched.current) inputRef.current?.focus({ preventScroll: true });
  }, [history, step, phase]);

  const push = (...lines: Line[]): void => setHistory((h) => [...h, ...lines]);

  const send = async (payload: Record<Field, string>): Promise<void> => {
    setPhase('sending');
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      push({
        kind: 'ok',
        text: `✓ Message sent. Thanks ${payload.name.split(' ')[0]}, I'll reply soon.`,
      });
      setPhase('sent');
    } catch {
      push({ kind: 'error', text: `✗ Could not send. Try again, or email ${email}.` });
      setPhase('failed');
    }
  };

  const submit = (): void => {
    if (!current) return;
    const parsed = fields[current.field].safeParse(draft);
    push({ kind: 'prompt', text: current.prompt }, { kind: 'answer', text: draft || ' ' });
    if (!parsed.success) {
      push({ kind: 'error', text: `✗ ${parsed.error.issues[0]?.message ?? 'invalid input'}` });
      // Like a shell, start a fresh line; a long message is kept so it can be fixed.
      if (current.type !== 'textarea') setDraft('');
      return;
    }
    const next = { ...values, [current.field]: parsed.data };
    setValues(next);
    setDraft('');
    if (current.field === 'name') push({ kind: 'ok', text: `✓ Hi ${parsed.data.split(' ')[0]}!` });
    if (step < steps.length - 1) setStep(step + 1);
    else {
      setStep(steps.length);
      void send(next);
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !(current?.type === 'textarea' && e.shiftKey)) {
      e.preventDefault();
      submit();
    }
  };

  const restart = (): void => {
    touched.current = true;
    setValues({ name: '', email: '', message: '' });
    setHistory([{ kind: 'muted', text: 'clear' }]);
    setStep(0);
    setPhase('input');
  };

  const retry = (): void => {
    touched.current = true;
    push({ kind: 'muted', text: 'retrying…' });
    void send(values);
  };

  const lineClass: Record<Line['kind'], string> = {
    prompt: 'text-sky-600 dark:text-sky-300',
    answer: 'text-foreground whitespace-pre-wrap break-words pl-[2ch] -indent-[2ch]',
    error: 'text-destructive',
    ok: 'text-emerald-600 dark:text-emerald-400',
    muted: 'text-muted-foreground',
  };

  const renderLine = (l: Line, i: number): ReactNode =>
    l.kind === 'answer' ? (
      <p key={i} className={lineClass.answer}>
        <span className="text-muted-foreground select-none">&gt; </span>
        {l.text}
      </p>
    ) : (
      <p key={i} className={lineClass[l.kind]}>
        {l.kind === 'prompt' && <span className="select-none">? </span>}
        {l.text}
      </p>
    );

  return (
    <form
      action={action}
      method="POST"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onPointerDown={() => {
        touched.current = true;
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
        inputRef.current?.focus({ preventScroll: true });
      }}
      className="bg-background/80 overflow-hidden rounded-2xl border font-mono text-[13px] leading-relaxed shadow-2xl shadow-black/10 backdrop-blur-xl sm:text-sm dark:shadow-black/50"
    >
      {/* Window chrome */}
      <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#28c840]" aria-hidden="true" />
        <span className="text-muted-foreground ml-2 truncate text-xs">
          guest@estiak.me — contact
        </span>
      </div>

      <div ref={scrollRef} className="h-[22rem] space-y-1 overflow-y-auto p-5 sm:h-[24rem]">
        <p>
          {PS1} <span className="text-foreground">./contact --new</span>
        </p>
        <p className="text-muted-foreground">Answer each question and press Enter.</p>

        <div aria-live="polite" className="space-y-1">
          {history.map(renderLine)}
        </div>

        {phase === 'input' && current && (
          <div className="pt-1">
            <label htmlFor={`term-${current.field}`} className={cn('block', lineClass.prompt)}>
              <span className="select-none">? </span>
              {current.prompt}
            </label>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground select-none" aria-hidden="true">
                &gt;
              </span>
              {current.type === 'textarea' ? (
                <textarea
                  ref={inputRef}
                  id={`term-${current.field}`}
                  name={current.field}
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="text-foreground caret-primary min-w-0 flex-1 resize-none bg-transparent outline-none"
                />
              ) : (
                <input
                  ref={inputRef}
                  id={`term-${current.field}`}
                  name={current.field}
                  type={current.type}
                  autoComplete={current.field}
                  spellCheck={false}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="text-foreground caret-primary min-w-0 flex-1 bg-transparent outline-none"
                />
              )}
            </div>
          </div>
        )}

        {phase === 'sending' && (
          <p className="text-muted-foreground">
            Sending
            <span className="terminal-dots" aria-hidden="true" />
          </p>
        )}

        {(phase === 'sent' || phase === 'failed') && (
          <p className="flex flex-wrap items-center gap-2 pt-1">
            {PS1}
            {phase === 'failed' && (
              <button
                type="button"
                onClick={retry}
                className="text-primary underline-offset-4 hover:underline"
              >
                [retry]
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              className="text-primary underline-offset-4 hover:underline"
            >
              [new message]
            </button>
            <span className="terminal-caret" aria-hidden="true" />
          </p>
        )}
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-5 py-3 text-xs">
        <span>{phase === 'input' && current ? `step ${step + 1}/${steps.length}` : phase}</span>
        {phase === 'input' && current && (
          <button
            type="submit"
            className="text-foreground hover:border-primary hover:text-primary rounded-md border px-2.5 py-1 font-medium transition-colors"
          >
            ⏎ Enter
          </button>
        )}
      </div>
    </form>
  );
}
