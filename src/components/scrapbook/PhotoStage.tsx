import { useRef, type CSSProperties, type PointerEvent, type TouchEvent, type WheelEvent } from "react";
import { cn } from "@/lib/utils";
import { clampCrop, emptyCrop, type PhotoCrop } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";

type PhotoStageProps = {
  src: string;
  alt: string;
  crop?: PhotoCrop;
  editable?: boolean;
  oval?: boolean;
  priority?: boolean;
  onCrop?: (crop: PhotoCrop) => void;
  onOpen?: () => void;
};

export function PhotoStage({ src, alt, crop, editable, oval, priority, onCrop, onOpen }: PhotoStageProps) {
  const value = clampCrop(crop ?? emptyCrop());
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; z: number } | null>(null);

  function write(next: PhotoCrop) {
    onCrop?.(clampCrop(next));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!editable) return;
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, cx: value.x, cy: value.y, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!editable || !drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    const box = event.currentTarget.getBoundingClientRect();
    write({
      x: drag.current.cx - (dx / Math.max(box.width, 1)) * 100,
      y: drag.current.cy - (dy / Math.max(box.height, 1)) * 100,
      z: value.z,
    });
  }

  function onPointerUp() {
    const moved = drag.current?.moved;
    drag.current = null;
    pinch.current = null;
    if (!moved && !editable) onOpen?.();
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (!editable) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    write({ ...value, z: value.z + delta });
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!editable || event.touches.length !== 2) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    if (!a || !b) return;
    pinch.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: value.z };
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!editable || !pinch.current || event.touches.length !== 2) return;
    event.preventDefault();
    const [a, b] = [event.touches[0], event.touches[1]];
    if (!a || !b) return;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    write({ ...value, z: pinch.current.z * (dist / Math.max(pinch.current.dist, 1)) });
  }

  const style = {
    "--crop-x": `${50 - value.x}%`,
    "--crop-y": `${50 - value.y}%`,
    "--crop-z": String(value.z),
  } as CSSProperties;

  return (
    <div
      className={cn("photo-stage relative h-full w-full", oval && "photo-stage--oval", editable && "is-edit")}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onClick={() => {
        if (!editable) onOpen?.();
      }}
    >
      <DevelopingImage src={src} alt={alt} priority={priority} className="photo-stage-img" />
      {editable ? (
        <div className="photo-crop-zoom">
          <button
            type="button"
            className="album-btn album-btn--tiny"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => write({ ...value, z: value.z - 0.15 })}
          >
            −
          </button>
          <button
            type="button"
            className="album-btn album-btn--tiny"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => write({ ...value, z: value.z + 0.15 })}
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
