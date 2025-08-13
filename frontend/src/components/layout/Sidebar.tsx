import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  ListTodo,
  FileText,
  CalendarDays,
  Folder,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import flocusLogo from "assets/flocus_logo.png";
import { cn } from "../../utils/utils";

interface SidebarProps {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  handleLogout: () => void;
}

const NavLinkItem: React.FC<{
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isMenuOpen: boolean;
  end?: boolean;
}> = ({ to, icon: Icon, children, isMenuOpen, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
        !isMenuOpen && "justify-center",
        isActive
          ? "text-slate-900 bg-background-DEFAULT font-semibold"
          : "text-slate-700 hover:bg-background-DEFAULT"
      )
    }
  >
    <Icon size={20} className="flex-shrink-0" />
    <span
      className={cn(
        "truncate transition-opacity duration-200",
        !isMenuOpen && "opacity-0"
      )}
    >
      {children}
    </span>
  </NavLink>
);

const navItems = [
  { to: "/dashboard", icon: Home, text: "Dashboard", end: true },
  { to: "/my-day", icon: CalendarDays, text: "My Day" },
  { to: "/tasks", icon: ListTodo, text: "Tasks" },
  { to: "/templates", icon: FileText, text: "Templates" },
  { to: "/categories", icon: Folder, text: "Categories" },
  { to: "/settings", icon: Settings, text: "Settings" },
];

export default function Sidebar({
  isMenuOpen,
  toggleMenu,
  handleLogout,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative flex flex-col bg-background-card border-r border-slate-200 p-4 sticky top-0 h-screen transition-all duration-300 ease-in-out",
        isMenuOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-3">
          <img
            src={flocusLogo}
            alt="Flocus Logo"
            className="size-10 w-10 h-10 flex-shrink-0"
          />
          <h1
            className={cn(
              "text-slate-900 text-lg font-semibold truncate transition-opacity duration-200",
              !isMenuOpen && "opacity-0"
            )}
          >
            Flocus
          </h1>
        </div>
        <button
          onClick={toggleMenu}
          className="flex items-center justify-center size-8 text-slate-700 hover:bg-background-DEFAULT rounded-lg transition-colors text-sm font-medium"
        >
          <span className="sr-only">Toggle menu</span>
          {isMenuOpen ? (
            <ChevronLeft size={20} className="flex-shrink-0" />
          ) : (
            <ChevronRight size={20} className="flex-shrink-0" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-1 flex-grow mt-4">
        {navItems.map((item) => (
          <NavLinkItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            isMenuOpen={isMenuOpen}
            end={item.end}
          >
            {item.text}
          </NavLinkItem>
        ))}
      </nav>

      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-background-DEFAULT rounded-lg transition-colors w-full text-sm font-medium",
            !isMenuOpen && "justify-center"
          )}
        >
          <LogOut size={20} className="text-slate-700 flex-shrink-0" />
          <span
            className={cn(
              "truncate transition-opacity duration-200",
              !isMenuOpen && "opacity-0"
            )}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
