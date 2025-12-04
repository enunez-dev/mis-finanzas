import { ReactNode } from 'react'
import { PieChart, DollarSign, List } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: PieChart },
    { name: 'Transactions', path: '/transactions', icon: List },
    { name: 'Budgets', path: '/budgets', icon: DollarSign },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">Mis Finanzas</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center px-4 py-3 text-gray-700 rounded-md transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
