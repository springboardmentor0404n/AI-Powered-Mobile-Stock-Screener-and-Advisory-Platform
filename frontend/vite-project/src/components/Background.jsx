import React from 'react';

export default function Background() {
  return (
    <>
      <style>{`
        .bg-root{ position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none; }
        .bg-blob{ position:absolute; border-radius:50%; filter:blur(60px); opacity:0.7; transform:translate3d(0,0,0); }
        .b1{ width:520px; height:520px; left:-120px; top:-80px; background: radial-gradient(circle at 30% 30%, #7c3aed, #4f46e5 60%, transparent 70%); animation: move1 12s ease-in-out infinite; }
        .b2{ width:420px; height:420px; right:-100px; top:40px; background: radial-gradient(circle at 20% 20%, #06b6d4, #0ea5a4 50%, transparent 70%); animation: move2 14s ease-in-out infinite; }
        .b3{ width:360px; height:360px; right:30%; bottom:-140px; background: radial-gradient(circle at 40% 40%, #fb7185, #fb923c 50%, transparent 70%); animation: move3 10s ease-in-out infinite; }

        @keyframes move1{ 0%{ transform: translateY(0) translateX(0) } 50%{ transform: translateY(30px) translateX(20px)} 100%{ transform: translateY(0) translateX(0)} }
        @keyframes move2{ 0%{ transform: translateY(0) translateX(0) } 50%{ transform: translateY(-30px) translateX(-20px)} 100%{ transform: translateY(0) translateX(0)} }
        @keyframes move3{ 0%{ transform: translateY(0) translateX(0) } 50%{ transform: translateY(20px) translateX(-30px)} 100%{ transform: translateY(0) translateX(0)} }
      `}</style>

      <div className="bg-root">
        <div className="bg-blob b1" aria-hidden="true" />
        <div className="bg-blob b2" aria-hidden="true" />
        <div className="bg-blob b3" aria-hidden="true" />
      </div>
    </>
  );
}
