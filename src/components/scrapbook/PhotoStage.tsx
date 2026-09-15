import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent, type WheelEvent } from "react";
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
  const incoming = clampCrop(crop ?? emptyCrop());
  const [live, setLive] = useState(incoming);
  const value = live;
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (dragging.current) return;
    setLive(incoming);
  }, [incoming.x, incoming.y, incoming.z]);

  function write(next: PhotoCrop, commit = true) {
    const clamped = clampCrop(next);
    setLive(clamped);
    if (commit) onCrop?.(clamped);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!editable) return;
    event.preventDefault();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    dragging.current = true;
    drag.current = { x: event.clientX, y: event.clientY, cx: value.x, cy: value.y, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!editable || !drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    const box = event.currentTarget.getBoundingClientRect();
    write(
      {
        x: drag.current.cx + (dx / Math.max(box.width, 1)) * 100,
        y: drag.current.cy + (dy / Math.max(box.height, 1)) * 100,
        z: value.z,
      },
      false,
    );
  }

  function onPointerUp() {
    const moved = drag.current?.moved;
    if (moved) onCrop?.(clampCrop(value));
    drag.current = null;
    pinch.current = null;
    dragging.current = false;
    if (!moved && !editable) onOpen?.();
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (!editable) return;
    event.preventDefault();
    write({ ...value, z: value.z + (event.deltaY > 0 ? -0.08 : 0.08) });
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
    "--crop-tx": `${value.x}%`,
    "--crop-ty": `${value.y}%`,
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
        <div
          className="photo-crop-bar"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="photo-crop-btn"
            aria-label="−"
            onClick={() => write({ ...value, z: value.z - 0.1 })}
          >
            −
          </button>
          <input
            type="range"
            className="photo-crop-slider"
            min={1}
            max={3}
            step={0.01}
            value={value.z}
            aria-label="Zoom"
            onChange={(event) => write({ ...value, z: Number(event.target.value) })}
          />
          <button
            type="button"
            className="photo-crop-btn"
            aria-label="+"
            onClick={() => write({ ...value, z: value.z + 0.1 })}
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
