import { useT } from "@/lib/i18n/locale";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, body, onConfirm, onCancel }: ConfirmDialogProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="lightbox-scrim" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={onCancel}>
      <div className="caption-strip confirm-card relative z-10 mx-4 max-w-sm p-5" onClick={(event) => event.stopPropagation()}>
        <p id="confirm-title" className="font-typewriter text-place text-lagoon-deep">
          {title}
        </p>
        {body ? <p className="mt-2 font-script text-caption text-ink">{body}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="album-btn album-btn--ghost" onClick={onCancel}>
            {t("ui.cancel")}
          </button>
          <button type="button" className="album-btn album-btn--danger" onClick={onConfirm}>
            {t("ui.confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
