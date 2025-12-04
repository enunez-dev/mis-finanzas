import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'

interface Summary {
  income: number
  expense: number
  balance: number
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')

      if (error) throw error

      const income = data
        .filter((t) => t.type === 'income')
        .reduce((acc, curr) => acc + Number(curr.amount), 0)

      const expense = data
        .filter((t) => t.type === 'expense')
        .reduce((acc, curr) => acc + Number(curr.amount), 0)

      setSummary({
        income,
        expense,
        balance: income - expense,
      })
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Total Balance</h3>
            <Wallet className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${summary.balance.toFixed(2)}</p>
        </div>

        {/* Income Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Total Income</h3>
            <ArrowUpCircle className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">+${summary.income.toFixed(2)}</p>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Total Expenses</h3>
            <ArrowDownCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">-${summary.expense.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
