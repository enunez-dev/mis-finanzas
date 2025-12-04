import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReactApexChart from 'react-apexcharts'
import { Calendar, ArrowUp, ArrowDown, DollarSign, CreditCard } from 'lucide-react'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [metrics, setMetrics] = useState({
    income: 0,
    expense: 0,
    budget: 0,
    balance: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [expenseComposition, setExpenseComposition] = useState({ series: [], labels: [] })

  useEffect(() => {
    fetchData()
  }, [currentMonth])

  const fetchData = async () => {
    setLoading(true)
    try {
      const startOfMonth = `${currentMonth}-01`
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString().slice(0, 10)

      const [transactionsRes, budgetRes, categoriesRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, categories(name, parent_id)')
          .gte('date', startOfMonth)
          .lt('date', endOfMonth)
          .order('date', { ascending: false }),
        supabase
          .from('budgets')
          .select('*, budget_details(*)')
          .eq('month', currentMonth)
          .maybeSingle(),
        supabase.from('categories').select('*')
      ])

      if (transactionsRes.error) throw transactionsRes.error
      if (budgetRes.error) throw budgetRes.error
      if (categoriesRes.error) throw categoriesRes.error

      const transactions = transactionsRes.data || []
      const budget = budgetRes.data
      const categories = categoriesRes.data || []

      // Calculate Metrics
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const totalBudget = budget
        ? (budget.budget_details || []).reduce((sum, d) => sum + Number(d.amount), 0)
        : 0

      setMetrics({
        income,
        expense,
        budget: totalBudget,
        balance: income - expense
      })

      setRecentTransactions(transactions.slice(0, 5))

      // Calculate Expense Composition (by Parent Category)
      const parentCategories = categories.filter(c => !c.parent_id)
      const chartSeries = []
      const chartLabels = []

      parentCategories.forEach(parent => {
        // Find all subcategories for this parent
        const subIds = categories.filter(c => c.parent_id === parent.id).map(c => c.id)

        // Sum expenses for these subcategories
        const parentExpense = transactions
          .filter(t => t.type === 'expense' && subIds.includes(t.category_id))
          .reduce((sum, t) => sum + Number(t.amount), 0)

        if (parentExpense > 0) {
          chartSeries.push(parentExpense)
          chartLabels.push(parent.name)
        }
      })

      setExpenseComposition({ series: chartSeries, labels: chartLabels })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const donutOptions = {
    chart: { type: 'donut' },
    labels: expenseComposition.labels,
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
              formatter: () => `$${metrics.expense.toLocaleString()}`
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Dashboard
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
        {/* Card: Income */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <ArrowUp className="text-success" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                ${metrics.income.toLocaleString()}
              </h4>
              <span className="text-sm font-medium text-gray-500">Total Ingresos</span>
            </div>
          </div>
        </div>

        {/* Card: Expense */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <ArrowDown className="text-danger" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                ${metrics.expense.toLocaleString()}
              </h4>
              <span className="text-sm font-medium text-gray-500">Total Gastos</span>
            </div>
          </div>
        </div>

        {/* Card: Budget */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <CreditCard className="text-primary" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                ${metrics.budget.toLocaleString()}
              </h4>
              <span className="text-sm font-medium text-gray-500">Presupuestado</span>
            </div>
          </div>
        </div>

        {/* Card: Balance */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <DollarSign className="text-warning" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className={`text-title-md font-bold ${metrics.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                ${metrics.balance.toLocaleString()}
              </h4>
              <span className="text-sm font-medium text-gray-500">Balance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        {/* Chart */}
        <div className="col-span-12 xl:col-span-5 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
          <div className="mb-3 justify-between gap-4 sm:flex">
            <div>
              <h5 className="text-xl font-semibold text-black dark:text-white">
                Gastos por Categoría
              </h5>
            </div>
          </div>
          <div className="mb-2">
            <div id="chartThree" className="mx-auto flex justify-center">
              <ReactApexChart options={donutOptions} series={expenseComposition.series} type="donut" height={350} width={380} />
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-span-12 xl:col-span-7 rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
            Transacciones Recientes
          </h4>

          <div className="flex flex-col">
            <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-4">
              <div className="p-2.5 xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">Categoría</h5>
              </div>
              <div className="p-2.5 text-center xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">Fecha</h5>
              </div>
              <div className="p-2.5 text-center xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">Descripción</h5>
              </div>
              <div className="hidden p-2.5 text-center sm:block xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">Monto</h5>
              </div>
            </div>

            {recentTransactions.map((t, key) => (
              <div
                className={`grid grid-cols-3 sm:grid-cols-4 ${key === recentTransactions.length - 1
                    ? ""
                    : "border-b border-stroke dark:border-strokedark"
                  }`}
                key={key}
              >
                <div className="flex items-center gap-3 p-2.5 xl:p-5">
                  <p className="hidden text-black dark:text-white sm:block">
                    {t.categories?.name || '-'}
                  </p>
                </div>

                <div className="flex items-center justify-center p-2.5 xl:p-5">
                  <p className="text-black dark:text-white">{t.date}</p>
                </div>

                <div className="flex items-center justify-center p-2.5 xl:p-5">
                  <p className="text-meta-3">{t.description}</p>
                </div>

                <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                  <p className={`font-medium ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {recentTransactions.length === 0 && (
              <div className="p-5 text-center text-gray-500">
                No hay transacciones recientes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
