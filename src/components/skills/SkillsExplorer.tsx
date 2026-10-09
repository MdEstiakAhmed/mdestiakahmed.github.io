import { useMemo, useState } from 'react';

import type { SkillGroup } from '@/data/site-data';
import { cn } from '@/lib/utils';

import SkillGlobe, { type GlobeItem } from './SkillGlobe';

interface Props {
  groups: readonly SkillGroup[];
}

/** Group tabs + a readable list, driving the decorative globe beside it. */
export default function SkillsExplorer({ groups }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? selected;

  const items = useMemo<GlobeItem[]>(
    () => groups.flatMap((g) => g.items.map((label) => ({ label, group: g.group }))),
    [groups],
  );

  const tabs: { id: string | null; label: string; count: number }[] = [
    { id: null, label: 'All', count: items.length },
    ...groups.map((g) => ({ id: g.group, label: g.group, count: g.items.length })),
  ];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-8">
        <div role="group" aria-label="Filter skills" className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const pressed = selected === t.id;
            return (
              <button
                key={t.label}
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelected(t.id)}
                onPointerEnter={() => setHovered(t.id)}
                onPointerLeave={() => setHovered(null)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  pressed
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:border-primary hover:text-primary',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    pressed ? 'bg-primary-foreground/20' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* The list stays whole so the layout never jumps; the active group is emphasised. */}
        <div className="space-y-6">
          {groups.map((g) => (
            <div
              key={g.group}
              className={cn(
                'transition-opacity duration-300',
                active !== null && active !== g.group && 'opacity-35',
              )}
            >
              <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                {g.group}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <li
                    key={item}
                    className="bg-card hover:border-primary hover:text-primary rounded-full border px-3 py-1 text-sm transition-colors"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SkillGlobe items={items} active={active} className="mx-auto max-w-[34rem]" />
    </div>
  );
}
