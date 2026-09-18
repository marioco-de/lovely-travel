import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

type EditGearProps = {
  label?: string;
  children: (close: () => void) => ReactNode;
};

export function EditGear({ label, children }: EditGearProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="edit-gear"
        aria-label={label || t("ui.settings")}
        onClick={() => setOpen(true)}
      >
        <Settings size={20} strokeWidth={1.9} />
      </button>
      {mounted && open
        ? createPortal(
            <div className="edit-gear-overlay" onClick={() => setOpen(false)}>
              <div
                className="edit-gear-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={label || t("ui.settings")}
                onClick={(event) => event.stopPropagation()}
              >
                {children(() => setOpen(false))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function GearAction({
  children,
  onClick,
  href,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = cn("edit-gear-action", danger && "is-danger");
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}
