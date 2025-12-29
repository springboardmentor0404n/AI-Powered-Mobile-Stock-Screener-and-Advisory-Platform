import React from 'react';

export default function Background() {
  return (
    <>
      <style>{`
        .bg-root { 
          position: fixed; 
          inset: 0; 
          z-index: -1; 
          background-color: #f8fafc; /* Very light slate */
          overflow: hidden; 
          pointer-events: none; 
        }

        /* The Grid Pattern */
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at center, black, transparent 80%);
        }

        /* The Dynamic Glow */
        .bg-glow { 
          position: absolute; 
          width: 800px; 
          height: 800px; 
          border-radius: 50%; 
          filter: blur(100px); 
          opacity: 0.15;
          background: radial-gradient(circle, #6366f1, #a855f7, transparent 70%);
          animation: orbit 20s linear infinite;
        }

        @keyframes orbit {
          0% { top: -10%; left: -10%; transform: scale(1); }
          33% { top: 20%; left: 60%; transform: scale(1.1); }
          66% { top: 60%; left: 10%; transform: scale(0.9); }
          100% { top: -10%; left: -10%; transform: scale(1); }
        }
      `}</style>

      <div className="bg-root">
        {/* Subtle geometric grid */}
        <div className="bg-grid" aria-hidden="true" />
        
        {/* One large, slow, professional moving light */}
        <div className="bg-glow" aria-hidden="true" />
        
        {/* Decorative noise texture (optional for high-end feel) */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 0.02, 
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} />
      </div>
    </>
  );
}