import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";
import { isVideoSrc, posterSrc, videoFallbacks, type PhotoPlay } from "@/lib/album/media";

type DevelopingImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  media?: "photo" | "video";
  play?: PhotoPlay;
};

export function DevelopingImage({ src, alt, className, priority = false, media, play = "loop" }: DevelopingImageProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const video = isVideoSrc(src, media);
  const poster = video ? posterSrc(src) : src;
  const sources = video ? videoFallbacks(src) : [];
  const clip = sources[sourceIndex] ?? sources[0] ?? "";

  useEffect(() => {
    setLoaded(false);
    setCanPlay(false);
    setSourceIndex(0);
  }, [src]);

  useEffect(() => {
    const img = ref.current?.querySelector("img");
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [ref, src]);

  useEffect(() => {
    if (!video || !inView) return;
    const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
    const timer = window.setTimeout(() => setCanPlay(true), wait);
    return () => window.clearTimeout(timer);
  }, [video, inView]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canPlay) return;
    el.muted = true;
    el.playsInline = true;
    el.loop = play !== "boomerang";
    const run = el.play();
    if (run) void run.catch(() => undefined);
    if (play !== "boomerang") return;

    let reverse = false;
    let ticking = 0;
    const step = () => {
      if (!videoRef.current) return;
      const node = videoRef.current;
      if (reverse) {
        const next = node.currentTime - 1 / 30;
        if (next <= 0.04) {
          reverse = false;
          node.currentTime = 0;
          void node.play().catch(() => undefined);
        } else {
          node.currentTime = next;
        }
      }
      ticking = window.requestAnimationFrame(step);
    };
    const onTime = () => {
      if (reverse || !videoRef.current) return;
      if (videoRef.current.currentTime >= videoRef.current.duration - 0.08) {
        reverse = true;
        videoRef.current.pause();
      }
    };
    el.addEventListener("timeupdate", onTime);
    ticking = window.requestAnimationFrame(step);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      window.cancelAnimationFrame(ticking);
    };
  }, [canPlay, play, clip]);

  const developed = inView && loaded;

  return (
    <div ref={ref} className={cn("develop-stage", developed && "is-developed", className)}>
      <img
        src={poster}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className="polaroid-emulsion h-full w-full object-cover"
      />
      {video && canPlay && clip ? (
        <video
          ref={videoRef}
          src={clip}
          poster={poster}
          muted
          playsInline
          autoPlay
          onError={() => setSourceIndex((index) => (index + 1 < sources.length ? index + 1 : index))}
          className="polaroid-emulsion develop-video h-full w-full object-cover"
        />
      ) : null}
      <span className="develop-cast" aria-hidden="true" />
      <span className="develop-veil" aria-hidden="true" />
    </div>
  );
}
