import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex gap-6 px-6 py-4 border-b bg-white">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive
            ? "font-semibold text-blue-600"
            : "text-gray-600 hover:text-blue-600"
        }
      >
        Formula Catalog
      </NavLink>

      <NavLink
        to="/variables"
        className={({ isActive }) =>
          isActive
            ? "font-semibold text-blue-600"
            : "text-gray-600 hover:text-blue-600"
        }
      >
        Variable Index
      </NavLink>
    </nav>
  );
}

export default Navbar;