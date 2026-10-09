import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  items: readonly NavItem[];
}

export default function MobileMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="bg-card inline-flex size-10 items-center justify-center rounded-full border"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open &&
        // Portal: the header's backdrop-filter would otherwise become the containing block for `fixed`.
        createPortal(
          <nav
            id={panelId}
            aria-label="Mobile"
            className="bg-background/95 fixed inset-x-0 top-16 bottom-0 z-40 px-6 py-8 backdrop-blur"
          >
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="hover:bg-accent block rounded-lg px-3 py-3 text-lg font-medium"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>,
          document.body,
        )}
    </div>
  );
}
