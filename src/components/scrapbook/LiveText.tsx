import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useAlbum } from "@/lib/album/store";

const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

type LiveTextProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  tag?: "p" | "h1" | "h2" | "h3" | "span";
};

export function LiveText({
  value,
  onChange,
  placeholder = LOREM,
  className,
  tag: Tag = "p",
}: LiveTextProps) {
  const canEdit = useAlbum((s) => s.canEdit);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const showPlaceholder = canEdit && !value.trim() && !focused;
  const text = showPlaceholder ? placeholder : value;

  if (!canEdit) {
    if (!value.trim()) return null;
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      className={cn("live-text outline-none", showPlaceholder && "live-text--ph", className)}
      onFocus={(event) => {
        setFocused(true);
        if (!value.trim()) event.currentTarget.textContent = "";
      }}
      onBlur={(event) => {
        setFocused(false);
        const next = (event.currentTarget.textContent ?? "").replace(/\u00a0/g, " ").trim();
        const cleaned = next === placeholder ? "" : next;
        onChange(cleaned);
        if (!cleaned) event.currentTarget.textContent = placeholder;
      }}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    >
      {text}
    </Tag>
  );
}
