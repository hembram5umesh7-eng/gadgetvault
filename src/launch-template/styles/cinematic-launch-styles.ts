/** Cinematic skeuomorphic CSS — inject once per launch page */
export const CINEMATIC_LAUNCH_STYLES = `
  .film-grain {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50; opacity: 0.06; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }
  .bg-grid-launch {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
  }
  .text-silver-matte {
    background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    filter: drop-shadow(0px 10px 24px rgba(0,0,0,0.5)) drop-shadow(0px 2px 4px rgba(0,0,0,0.4));
  }
  .text-3d-matte {
    color: #fafafa;
    text-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.3);
  }
  .premium-depth-card {
    background: linear-gradient(145deg, #1a2410 0%, #0a1008 55%, #121a0c 100%);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9), 0 20px 40px -20px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.06);
    position: relative;
  }
  .card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(700px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(107,142,35,0.18) 0%, transparent 42%);
    mix-blend-mode: screen;
  }
  .countdown-tile {
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 12px 28px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
  }
  .floating-ui-badge {
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
    backdrop-filter: blur(20px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15);
    backface-visibility: hidden;
    transform: translateZ(0);
  }
  .feature-pill {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .photo-frame {
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .launch-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    height: 3rem; padding: 0 2rem; border-radius: 9999px; font-weight: 700; font-size: 1rem;
    background: linear-gradient(180deg, #6B8E23 0%, #556B2F 100%);
    color: white; border: none; cursor: pointer;
    box-shadow: 0 12px 28px rgba(85,107,47,0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .launch-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 32px rgba(85,107,47,0.45); }
  .reveal-sound-prompt {
    animation: reveal-sound-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 24px rgba(107,142,35,0.3);
  }
  @keyframes reveal-sound-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.03); }
  }
`;
