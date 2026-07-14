import { NavLink } from "react-router-dom";

function Navbar() {
  const baseStyle =
    "px-4 lg:px-6 py-2.5 rounded-2xl transition-all duration-500 flex items-center gap-2 lg:gap-3 font-medium relative whitespace-nowrap";

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#2D241E] border-b border-stone-800/60">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-12 py-4 flex items-center gap-4">

        {/* Brand */}
        <div className="text-orange-100/90 font-black tracking-[0.1em] lg:tracking-[0.2em] text-xl lg:text-2xl shrink-0">
          PHYSUTH
        </div>

        {/* Links */}
        <div className="flex items-center gap-1 sm:gap-4 flex-1 justify-center min-w-0 overflow-hidden">

          {/* Formula Map — หน้าแรก */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `
              ${baseStyle}
              ${isActive
                ? "text-orange-300 bg-orange-100/5 shadow-[inset_0_0_15px_rgba(251,146,60,0.05)]"
                : "text-stone-500 hover:text-stone-200 hover:bg-white/[0.03]"}
            `}
          >
            {/* caramel dot — หน้าหลัก/map */}
            <span className="w-2 h-2 rounded-full bg-[#D4831A] shadow-[0_0_10px_#D4831A] shrink-0" />
            <span className="text-xs sm:text-sm lg:text-base truncate max-w-[100px] lg:max-w-none">
              Formula Map
            </span>
          </NavLink>

          {/* Formula Catalog */}
          <NavLink
            to="/formula"
            className={({ isActive }) => `
              ${baseStyle}
              ${isActive
                ? "text-orange-300 bg-orange-100/5 shadow-[inset_0_0_15px_rgba(251,146,60,0.05)]"
                : "text-stone-500 hover:text-stone-200 hover:bg-white/[0.03]"}
            `}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc] shrink-0" />
            <span className="text-xs sm:text-sm lg:text-base truncate max-w-[100px] lg:max-w-none">
              Formula Catalog
            </span>
          </NavLink>

          {/* Variable Index */}
          <NavLink
            to="/variables"
            className={({ isActive }) => `
              ${baseStyle}
              ${isActive
                ? "text-orange-300 bg-orange-100/5 shadow-[inset_0_0_15px_rgba(251,146,60,0.05)]"
                : "text-stone-500 hover:text-stone-200 hover:bg-white/[0.03]"}
            `}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0" />
            <span className="text-xs sm:text-sm lg:text-base">Variable Index</span>
          </NavLink>
        </div>

        {/* code */}
        <div className="flex-shrink-0 border-l border-stone-700 pl-6">
          <span className="text-[9px] text-orange-200/30 uppercase tracking-[0.3em] font-light">
            68-1_45_wlr-r1
          </span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;











































{/* Brand
<div className="flex items-center gap-3 shrink-0">

  <img
    src="/logo.png"
    alt="PHYSUTH logo"
    className="w-10 h-10 object-contain"
  />

  <div className="text-orange-100/90 font-black tracking-[0.1em] lg:tracking-[0.2em] text-xl lg:text-2xl">
    PHYSUTH
  </div>

</div>
*/}