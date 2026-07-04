import { useEffect, useRef } from "react";
import { animate, createTimeline } from "animejs";

/** SVGator / Jitter-inspired floating tech orbit animation */
export function TechOrbitSvg({ className = "" }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const ring = svg.querySelector("#orbit-ring");
    const pulse = svg.querySelector("#pulse-core");
    const nodes = svg.querySelectorAll(".orbit-node");
    const paths = svg.querySelectorAll(".orbit-path");

    paths.forEach((p) => {
      const len = (p as SVGPathElement).getTotalLength?.() ?? 200;
      (p as SVGPathElement).style.strokeDasharray = `${len}`;
      (p as SVGPathElement).style.strokeDashoffset = `${len}`;
    });

    const tl = createTimeline({ loop: true });

    tl.add(ring, {
      rotate: [0, 360],
      duration: 20000,
      ease: "linear",
    }, 0);

    tl.add(pulse, {
      scale: [1, 1.15, 1],
      opacity: [0.6, 1, 0.6],
      duration: 2400,
      ease: "inOut(2)",
    }, 0);

    tl.add(paths, {
      strokeDashoffset: (_el, i) => [(paths[i] as SVGPathElement).getTotalLength(), 0],
      duration: 1800,
      delay: (_el, i) => i * 300,
      ease: "out(3)",
    }, 0);

    tl.add(nodes, {
      translateY: (_el, i) => [0, i % 2 === 0 ? -8 : 8, 0],
      duration: 2800,
      delay: (_el, i) => i * 200,
      ease: "inOut(2)",
      loop: true,
    }, 0);

    return () => tl.pause();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 400"
      className={`pointer-events-none ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="tech-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g id="orbit-ring" style={{ transformOrigin: "200px 200px" }}>
        <circle cx="200" cy="200" r="140" fill="none" stroke="url(#tech-grad)" strokeWidth="1" opacity="0.25" />
        <circle cx="200" cy="200" r="100" fill="none" stroke="url(#tech-grad)" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 8" />
      </g>

      <path className="orbit-path" d="M 200 60 Q 340 200 200 340 Q 60 200 200 60" fill="none" stroke="url(#tech-grad)" strokeWidth="2" opacity="0.5" filter="url(#glow)" />
      <path className="orbit-path" d="M 200 100 L 300 200 L 200 300 L 100 200 Z" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.4" />

      <circle id="pulse-core" cx="200" cy="200" r="24" fill="url(#tech-grad)" opacity="0.8" filter="url(#glow)" style={{ transformOrigin: "200px 200px" }} />

      <g className="orbit-node" style={{ transformOrigin: "200px 80px" }}>
        <rect x="188" y="68" width="24" height="24" rx="6" fill="#06b6d4" opacity="0.9" />
      </g>
      <g className="orbit-node" style={{ transformOrigin: "320px 200px" }}>
        <rect x="308" y="188" width="24" height="24" rx="6" fill="#3b82f6" opacity="0.9" />
      </g>
      <g className="orbit-node" style={{ transformOrigin: "200px 320px" }}>
        <rect x="188" y="308" width="24" height="24" rx="6" fill="#8b5cf6" opacity="0.9" />
      </g>
      <g className="orbit-node" style={{ transformOrigin: "80px 200px" }}>
        <rect x="68" y="188" width="24" height="24" rx="6" fill="#06b6d4" opacity="0.9" />
      </g>
    </svg>
  );
}
