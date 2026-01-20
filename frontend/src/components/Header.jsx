import NotificationBell from "./NotificationBell";

export default function Header() {
  return (
    <header
      className="flex items-center justify-between px-6 py-4
                 bg-gradient-to-r from-black to-slate-900
                 sticky top-0 z-[100]"
    >
      {/* LEFT: Logo */}
      <h1 className="text-xl font-bold text-white">
        
      </h1>

      {/* RIGHT: Bell → User → Logout */}
      <div className="flex items-center gap-4">
        

      </div>
    </header>
  );
}
