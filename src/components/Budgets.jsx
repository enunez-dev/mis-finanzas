import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Calendar } from 'lucide-react'
import ReactApexChart from 'react-apexcharts'

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    amount: '',
  })

  useEffect(() => {
    fetchData()
  }, [currentMonth])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Categories and Budget Header in parallel
      const [categoriesRes, budgetRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('budgets')
          .select('*, budget_details(*, categories(name, parent_id))')
          .eq('month', currentMonth)
          .maybeSingle()
      ])

      if (categoriesRes.error) throw categoriesRes.error
      if (budgetRes.error) throw budgetRes.error

      const categoriesData = categoriesRes.data || []
      const budgetData = budgetRes.data

      setCategories(categoriesData)
      setBudgets(budgetData ? [budgetData] : [])

      // 2. If budget exists, fetch transactions linked to it
      if (budgetData) {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('category_id, amount, type')
          .eq('budget_id', budgetData.id)
          .eq('type', 'expense')

        if (transactionsError) throw transactionsError
        setTransactions(transactionsData || [])
      } else {
        setTransactions([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    setNewBudget(prev => ({
      ...prev,
      category_id: categoryId,
      amount: category?.default_amount || prev.amount || ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let budgetId
      const existingBudget = budgets.length > 0 ? budgets[0] : null

      if (existingBudget) {
        budgetId = existingBudget.id
      } else {
        const { data: newBudgetHeader, error: headerError } = await supabase
          .from('budgets')
          .insert({ month: currentMonth })
          .select()
          .single()

        if (headerError) throw headerError
        budgetId = newBudgetHeader.id
      }

      const { error: detailError } = await supabase
        .from('budget_details')
        .upsert({
          budget_id: budgetId,
          category_id: newBudget.category_id,
          amount: newBudget.amount,
        }, { onConflict: 'budget_id, category_id' })

      if (detailError) throw detailError

      setNewBudget(prev => ({ ...prev, amount: '' }))
      fetchData()
    } catch (error) {
      console.error(error)
      alert('Error al agregar presupuesto')
    }
  }

  const handleDelete = async (detailId) => {
    if (!confirm('¿Estás seguro?')) return
    try {
      const { error } = await supabase.from('budget_details').delete().eq('id', detailId)
      if (error) throw error
      fetchData()
    } catch (error) {
      alert('Error al eliminar presupuesto')
    }
  }

  // Grouping and Calculations
  const parentCategories = categories.filter(c => !c.parent_id)
  const getSubcategories = (parentId) => categories.filter(c => c.parent_id === parentId)

  const getDetailsForParent = (parentId) => {
    if (budgets.length === 0) return []
    const allDetails = budgets[0].budget_details || []
    const subIds = getSubcategories(parentId).map(s => s.id)
    return allDetails.filter(d => subIds.includes(d.category_id))
  }

  const getSpentForCategory = (categoryId) => {
    return transactions
      .filter(t => t.category_id === categoryId)
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  const totalBudget = budgets.length > 0
    ? (budgets[0].budget_details || []).reduce((sum, d) => sum + Number(d.amount), 0)
    : 0

  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalAvailable = totalBudget - totalSpent

  // Chart Data Preparation
  const chartSeries = parentCategories.map(parent => {
    const details = getDetailsForParent(parent.id)
    return details.reduce((sum, d) => sum + Number(d.amount), 0)
  })
  const chartLabels = parentCategories.map(p => p.name)

  const validChartIndices = chartSeries.map((val, idx) => val > 0 ? idx : -1).filter(idx => idx !== -1)
  const finalSeries = validChartIndices.map(idx => chartSeries[idx])
  const finalLabels = validChartIndices.map(idx => chartLabels[idx])

  const chartOptions = {
    chart: { type: 'donut' },
    labels: finalLabels,
    colors: ['#3C50E0', '#80CAEE', '#10B981', '#FFBA00', '#FF6766'],
    legend: { position: 'bottom' },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => `$${totalBudget.toLocaleString()}`
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
  }

  if (loading && categories.length === 0) return <div>Cargando...</div>

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Presupuestos
        </h2>
        <div className="relative">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="custom-input-date w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-4 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          />
          <Calendar className="absolute right-4 top-3 h-5 w-5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6">
        {/* Total Budget Card */}
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V9H15V11H13V13H15V15H13V17H11V15H9V13H11V11H9V9H11V7Z" /></svg>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <span className="text-sm font-medium">Total Presupuestado</span>
            </div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 18C7 19.1 7.9 20 9 20H15C16.1 20 17 19.1 17 18V6H7V18ZM9 8H15V18H9V8ZM19 3H15.5L14.5 2H9.5L8.5 3H5V5H19V3Z" /></svg>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <span className="text-sm font-medium">Total Gastado</span>
            </div>
          </div>
        </div>

        {/* Total Available Card */}
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V9H15V11H13V13H15V15H13V17H11V15H9V13H11V11H9V9H11V7Z" /></svg>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className={`text-title-md font-bold ${totalAvailable < 0 ? 'text-danger' : 'text-success'}`}>
                ${totalAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <span className="text-sm font-medium">Disponible</span>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="col-span-1 md:col-span-1 xl:col-span-1 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
          <div className="mb-3 justify-between gap-4 sm:flex">
            <div>
              <h5 className="text-xl font-semibold text-black dark:text-white">
                Composición
              </h5>
            </div>
          </div>
          <div className="mb-2">
            <div id="chartThree" className="mx-auto flex justify-center">
              <ReactApexChart options={chartOptions} series={finalSeries} type="donut" height={250} width={250} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5">
        {/* Add Budget Form */}
        <div className="flex flex-col gap-4 md:gap-6 2xl:gap-7.5">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke p-6 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Agregar Presupuesto
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="mb-6">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Categoría
                  </label>
                  <div className="relative z-20 bg-transparent dark:bg-form-input">
                    <select
                      value={newBudget.category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="relative z-20 w-full appearance-none rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    >
                      <option value="">Seleccionar Subcategoría</option>
                      {parentCategories.map(parent => (
                        <optgroup key={parent.id} label={parent.name}>
                          {getSubcategories(parent.id).map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="absolute top-1/2 right-4 z-30 -translate-y-1/2">
                      <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z" fill="" /></svg>
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Monto
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 1500"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                    step="0.01"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-white hover:bg-opacity-90"
                >
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Budget List */}
        <div className="xl:col-span-2 flex flex-col gap-4 md:gap-6 2xl:gap-7.5">
          {parentCategories.map(parent => {
            const details = getDetailsForParent(parent.id)
            if (details.length === 0) return null

            const parentTotal = details.reduce((sum, d) => sum + Number(d.amount), 0)

            return (
              <div key={parent.id} className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6 dark:border-strokedark flex justify-between items-center">
                  <h3 className="font-medium text-black dark:text-white">
                    {parent.name}
                  </h3>
                  <span className="font-bold text-primary">${parentTotal.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  {details.map((detail, index) => {
                    const spent = getSpentForCategory(detail.category_id)
                    const available = Number(detail.amount) - spent

                    return (
                      <div key={detail.id} className={`grid grid-cols-3 items-center p-4 px-6 hover:bg-gray-2 dark:hover:bg-meta-4 ${index !== details.length - 1 ? 'border-b border-stroke dark:border-strokedark' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                          <p className="text-sm text-black dark:text-white">{detail.categories?.name}</p>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500">Gastado</span>
                          <span className="text-sm font-medium text-black dark:text-white">${spent.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-end gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500">Disponible</span>
                            <span className={`text-sm font-bold ${available < 0 ? 'text-danger' : 'text-success'}`}>
                              ${available.toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(detail.id)}
                            className="text-gray-500 hover:text-danger"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {(!budgets.length || (budgets[0]?.budget_details?.length === 0)) && (
            <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark text-center text-gray-500">
              No hay presupuestos definidos para este mes.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
