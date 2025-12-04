import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  description: string
  type: 'income' | 'expense'
  date: string
  category_id: string
}

interface Category {
  id: string
  name: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    type: 'expense',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('categories').select('*'),
      ])

      if (transactionsRes.error) throw transactionsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setTransactions(transactionsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('transactions').insert({
        ...newTransaction,
      })

      if (error) throw error

      setNewTransaction({
        amount: '',
        description: '',
        type: 'expense',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
      })
      fetchData()
    } catch (error) {
      alert('Error adding transaction')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (error) {
      alert('Error deleting transaction')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Transactions</h2>

      {/* Add Transaction Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-4">Add New Transaction</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="date"
            value={newTransaction.date}
            onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newTransaction.description}
            onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
            className="p-2 border rounded"
            required
            step="0.01"
          />
          <select
            value={newTransaction.type}
            onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as 'income' | 'expense' })}
            className="p-2 border rounded"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" /> Add
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 font-medium text-gray-500">Date</th>
              <th className="p-4 font-medium text-gray-500">Description</th>
              <th className="p-4 font-medium text-gray-500">Amount</th>
              <th className="p-4 font-medium text-gray-500">Type</th>
              <th className="p-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-4">{t.date}</td>
                <td className="p-4">{t.description}</td>
                <td className={`p-4 font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                </td>
                <td className="p-4 capitalize">{t.type}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
