import { NavLink } from "react-router-dom";

const links = [
  { to: "/toolchain", label: "工具链自检" },
  { to: "/todos", label: "Todo（状态/请求演示）" },
];

export function Nav() {
  return (
    <nav className="mb-6 flex gap-3 text-sm" aria-label="主导航">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `rounded-full px-3 py-1 ${
              isActive ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
