import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { LayoutDashboard, DollarSign, CreditCard, PieChart } from "lucide-react";

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isMobile } = useSidebar();
  const location = useLocation();
  const { pathname } = location;

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Transacciones",
      path: "/transactions",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Presupuestos",
      path: "/budgets",
      icon: <PieChart size={20} />,
    },
  ];

  const sidebarClass = isMobile
    ? isMobileOpen
      ? "translate-x-0"
      : "-translate-x-full"
    : isExpanded
      ? "w-[290px]"
      : "w-[90px]";

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-y-hidden bg-white duration-300 ease-linear dark:bg-gray-900 lg:static lg:translate-x-0 border-r border-gray-200 ${sidebarClass}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <DollarSign size={24} />
          </div>
          {(isExpanded || isMobileOpen) && (
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              Mis Finanzas
            </span>
          )}
        </Link>
      </div>

      {/* Sidebar Menu */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">
          <ul className="mb-6 flex flex-col gap-1.5">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`group relative flex items-center gap-2.5 rounded-lg px-4 py-2 font-medium duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname === item.path
                      ? "bg-gray-100 text-blue-600 dark:bg-gray-800 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                    } ${!isExpanded && !isMobileOpen ? "justify-center" : ""}`}
                >
                  {item.icon}
                  {(isExpanded || isMobileOpen) && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
