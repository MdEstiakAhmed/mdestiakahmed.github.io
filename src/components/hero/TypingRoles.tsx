import { useEffect, useState } from 'react';

interface Props {
  roles: readonly string[];
}

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1600;

export default function TypingRoles({ roles }: Props) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(roles[0]?.length ?? 0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const word = roles[index] ?? '';
    let delay = deleting ? DELETE_MS : TYPE_MS;
    if (!deleting && length === word.length) delay = HOLD_MS;

    const id = window.setTimeout(() => {
      if (!deleting && length === word.length) setDeleting(true);
      else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((i) => (i + 1) % roles.length);
      } else setLength((l) => l + (deleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(id);
  }, [deleting, index, length, roles]);

  const word = roles[index] ?? '';
  return (
    <span aria-hidden="true">
      {word.slice(0, length)}
      <span className="ml-0.5 inline-block [height:1em] w-[2px] animate-pulse self-stretch bg-current align-[-0.1em]" />
    </span>
  );
}
