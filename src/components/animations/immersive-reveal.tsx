import { useEffect, useRef, type ReactNode, Children } from "react";
import { animate } from "animejs";

interface ImmersiveRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
  duration?: number;
  threshold?: number;
}

const OFFSET = 48;

export function ImmersiveReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 900,
  threshold = 0.12,
}: ImmersiveRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from: Record<string, number | string> = { opacity: 0 };
    if (direction === "up") from.translateY = OFFSET;
    if (direction === "down") from.translateY = -OFFSET;
    if (direction === "left") from.translateX = OFFSET;
    if (direction === "right") from.translateX = -OFFSET;
    if (direction === "scale") {
      from.scale = 0.88;
      from.filter = "blur(8px)";
    }

    Object.assign(el.style, { opacity: "0" });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate(el, {
          ...from,
          opacity: [0, 1],
          translateY: direction === "up" ? [OFFSET, 0] : direction === "down" ? [-OFFSET, 0] : undefined,
          translateX: direction === "left" ? [OFFSET, 0] : direction === "right" ? [-OFFSET, 0] : undefined,
          scale: direction === "scale" ? [0.88, 1] : undefined,
          filter: direction === "scale" ? ["blur(8px)", "blur(0px)"] : undefined,
          duration,
          delay,
          ease: "out(4)",
        });
        observer.disconnect();
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction, duration, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  stagger?: number;
}

export function StaggerReveal({ children, className = "", itemClassName = "", stagger = 80 }: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll("[data-reveal-item]");
    items.forEach((item) => {
      (item as HTMLElement).style.opacity = "0";
      (item as HTMLElement).style.transform = "translateY(32px)";
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate(items, {
          opacity: [0, 1],
          translateY: [32, 0],
          duration: 700,
          delay: (_el, i) => i * stagger,
          ease: "out(3)",
        });
        observer.disconnect();
      },
      { threshold: 0.08 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <div key={i} data-reveal-item className={itemClassName}>
          {child}
        </div>
      ))}
    </div>
  );
}
