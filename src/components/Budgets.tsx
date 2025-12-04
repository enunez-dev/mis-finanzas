import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

interface Budget {
  id: string
  category_id: string
  amount: number
  month: string
  categories: {
    name: string
  }
}

interface Category {
  id: string
  name: string
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7) + '-01', // YYYY-MM-01
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        supabase.from('budgets').select('*, categories(name)'),
        supabase.from('categories').select('*'),
      ])

      if (budgetsRes.error) throw budgetsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setBudgets(budgetsRes.data || [])
      setCategories(categoriesRes.data || [])

      // Set default category if available
      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setNewBudget(prev => ({ ...prev, category_id: categoriesRes.data[0].id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('budgets').insert({
        ...newBudget,
      })

      if (error) throw error

      setNewBudget(prev => ({ ...prev, amount: '' }))
      fetchData()
    } catch (error) {
      alert('Error adding budget')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      setBudgets(budgets.filter((b) => b.id !== id))
    } catch (error) {
      alert('Error deleting budget')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Budgets</h2>

      {/* Add Budget Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-4">Set Monthly Budget</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={newBudget.category_id}
            onChange={(e) => setNewBudget({ ...newBudget, category_id: e.target.value })}
            className="p-2 border rounded"
            required
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {categories.length === 0 && <option value="">No categories found</option>}
          </select>
          <input
            type="month"
            value={newBudget.month.slice(0, 7)}
            onChange={(e) => setNewBudget({ ...newBudget, month: e.target.value + '-01' })}
            className="p-2 border rounded"
            required
          />
          <input
            type="number"
            placeholder="Limit Amount"
            value={newBudget.amount}
            onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
            className="p-2 border rounded"
            required
            step="0.01"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" /> Set Budget
          </button>
        </form>
      </div>

      {/* Budgets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((b) => (
          <div key={b.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
            <button
              onClick={() => handleDelete(b.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{b.categories?.name || 'Unknown Category'}</h3>
            <p className="text-sm text-gray-500 mb-4">Month: {b.month}</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-blue-600">${Number(b.amount).toFixed(2)}</span>
                <span className="text-gray-500 text-sm ml-2">limit</span>
              </div>
            </div>
          </div>
        ))}
        {budgets.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            No budgets set.
          </div>
        )}
      </div>
    </div>
  )
}
