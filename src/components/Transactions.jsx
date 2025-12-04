import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBudgetId, setSelectedBudgetId] = useState('')

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

  useEffect(() => {
    // When date changes, try to auto-select the matching budget
    if (newTransaction.date) {
      const month = newTransaction.date.slice(0, 7)
      const matchingBudget = budgets.find(b => b.month === month)
      if (matchingBudget) {
        setSelectedBudgetId(matchingBudget.id)
      } else {
        setSelectedBudgetId('')
      }
    }
  }, [newTransaction.date, budgets])

  useEffect(() => {
    // When selected budget changes, update available categories
    if (selectedBudgetId) {
      const budget = budgets.find(b => b.id === selectedBudgetId)
      if (budget && budget.budget_details) {
        const budgetedCategoryIds = budget.budget_details.map(d => d.category_id)
        const filtered = categories.filter(c => budgetedCategoryIds.includes(c.id))
        setAvailableCategories(filtered)
      } else {
        setAvailableCategories([])
      }
    } else {
      setAvailableCategories([])
    }
  }, [selectedBudgetId, budgets, categories])

  const fetchData = async () => {
    try {
      const [transactionsRes, categoriesRes, budgetsRes] = await Promise.all([
        supabase.from('transactions').select('*, categories(name)').order('date', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('budgets').select('*, budget_details(category_id)').order('month', { ascending: false }),
      ])

      if (transactionsRes.error) throw transactionsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (budgetsRes.error) throw budgetsRes.error

      setTransactions(transactionsRes.data || [])
      setCategories(categoriesRes.data || [])
      setBudgets(budgetsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBudgetId) {
      alert('Debe seleccionar un presupuesto válido.')
      return
    }

    try {
      const { error } = await supabase.from('transactions').insert({
        ...newTransaction,
        budget_id: selectedBudgetId
      })

      if (error) throw error

      setNewTransaction({
        amount: '',
        description: '',
        type: 'expense',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
      })
      // Re-trigger date effect to reset budget selection if needed, or keep current
      fetchData()
    } catch (error) {
      alert('Error al agregar transacción')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro?')) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (error) {
      alert('Error al eliminar transacción')
    }
  }

  // Helper to group categories
  const groupCategories = (cats) => {
    const parents = categories.filter(c => !c.parent_id)
    return parents.map(parent => {
      const subs = cats.filter(c => c.parent_id === parent.id)
      if (subs.length === 0) return null
      return { parent, subs }
    }).filter(Boolean)
  }

  const groupedAvailableCategories = groupCategories(availableCategories)

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-title-md2 font-semibold text-black dark:text-white">Transacciones</h2>

      {/* Add Transaction Form */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Nueva Transacción
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Fecha</label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-sm font-medium text-black dark:text-white">Descripción</label>
              <input
                type="text"
                placeholder="Ej. Compra de supermercado"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Monto</label>
              <input
                type="number"
                placeholder="0.00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                required
                step="0.01"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Tipo</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Presupuesto</label>
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                required
              >
                <option value="">Seleccionar Presupuesto</option>
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>{b.month}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Categoría</label>
              <select
                value={newTransaction.category_id}
                onChange={(e) => setNewTransaction({ ...newTransaction, category_id: e.target.value })}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                required={newTransaction.type === 'expense'}
                disabled={!selectedBudgetId}
              >
                <option value="">Seleccionar Categoría</option>
                {groupedAvailableCategories.map(group => (
                  <optgroup key={group.parent.id} label={group.parent.name}>
                    {group.subs.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {!selectedBudgetId && newTransaction.date && (
                <span className="text-xs text-danger">No hay presupuesto para este mes.</span>
              )}
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="flex w-full justify-center rounded bg-primary p-3 text-white dark:text-white font-medium hover:bg-opacity-90"
                disabled={!selectedBudgetId}
              >
                <Plus className="w-5 h-5 mr-2" /> Agregar Transacción
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Transactions List */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                  Fecha
                </th>
                <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white">
                  Descripción
                </th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                  Categoría
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Monto
                </th>
                <th className="py-4 px-4 font-medium text-black dark:text-white">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="border-b border-[#eee] py-5 px-4 pl-9 dark:border-strokedark xl:pl-11">
                    <p className="text-black dark:text-white">{t.date}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{t.description}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{t.categories?.name || '-'}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className={`font-medium ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <div className="flex items-center space-x-3.5">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="hover:text-primary"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-gray-500">No hay transacciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
