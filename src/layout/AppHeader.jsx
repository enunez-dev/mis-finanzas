import { useSidebar } from "../context/SidebarContext";
import { Menu } from "lucide-react";
import DarkModeSwitcher from "../components/header/DarkModeSwitcher";

const AppHeader = () => {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex w-full bg-white drop-shadow-1 dark:bg-gray-900 dark:drop-shadow-none border-b border-gray-200">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sidebar Toggle Button */}
          <button
            aria-controls="sidebar"
            onClick={handleToggle}
            className="z-50 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={handleToggle}
            className="hidden lg:block p-1.5 text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <DarkModeSwitcher />
          </ul>

          {/* User Area */}
          <div className="flex items-center gap-4">
            <span className="hidden text-right lg:block">
              <span className="block text-sm font-medium text-black dark:text-white">
                Usuario
              </span>
              <span className="block text-xs">Admin</span>
            </span>
            <div className="h-10 w-10 rounded-full bg-gray-300 overflow-hidden">
              {/* Avatar placeholder */}
              <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
