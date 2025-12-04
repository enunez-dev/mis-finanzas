import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { Plus, Trash2, Paperclip, Eye, X, Upload } from 'lucide-react'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedBudgetId, setSelectedBudgetId] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState('')

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)

  // Upload for existing transaction
  const fileInputRef = useRef(null)
  const [uploadingId, setUploadingId] = useState(null)

  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    type: 'expense',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    receipt_file: null
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedBudgetId) {
      fetchTransactions()
    } else {
      setTransactions([])
    }
  }, [selectedBudgetId])

  useEffect(() => {
    if (newTransaction.date) {
      const month = newTransaction.date.slice(0, 7)
      const matchingBudget = budgets.find(b => b.month === month)
      if (matchingBudget) {
        setSelectedBudgetId(matchingBudget.id)
      }
    }
  }, [newTransaction.date, budgets])

  useEffect(() => {
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

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, budgetsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('budgets').select('*, budget_details(category_id)').order('month', { ascending: false }),
      ])

      if (categoriesRes.error) throw categoriesRes.error
      if (budgetsRes.error) throw budgetsRes.error

      setCategories(categoriesRes.data || [])
      setBudgets(budgetsRes.data || [])

      // Select most recent budget by default if available
      if (budgetsRes.data && budgetsRes.data.length > 0) {
        setSelectedBudgetId(budgetsRes.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .eq('budget_id', selectedBudgetId)
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
      setCurrentPage(1) // Reset to first page on new fetch
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewTransaction({ ...newTransaction, receipt_file: e.target.files[0] })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBudgetId) {
      alert('Debe seleccionar un presupuesto válido.')
      return
    }

    setUploading(true)
    try {
      let receiptUrl = null

      // Upload Image if exists
      if (newTransaction.receipt_file) {
        // Compress image
        const compressedFile = await compressImage(newTransaction.receipt_file, 25) // Max 20KB

        const file = compressedFile
        const fileExt = 'jpg' // Canvas exports as jpeg
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('file')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('file')
          .getPublicUrl(filePath)

        receiptUrl = publicUrl
      }

      const { error } = await supabase.from('transactions').insert({
        amount: newTransaction.amount,
        description: newTransaction.description,
        type: newTransaction.type,
        category_id: newTransaction.category_id,
        date: newTransaction.date,
        budget_id: selectedBudgetId,
        receipt_url: receiptUrl
      })

      if (error) throw error

      setNewTransaction({
        amount: '',
        description: '',
        type: 'expense',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        receipt_file: null
      })
      // Reset file input manually if needed, or just rely on state
      document.getElementById('receipt-upload').value = ''

      fetchTransactions()
    } catch (error) {
      console.error(error)
      alert('Error al agregar transacción')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (id) => {
    setTransactionToDelete(id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!transactionToDelete) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete)
      if (error) throw error

      // Update local state to avoid refetch if possible, or just refetch
      setTransactions(transactions.filter((t) => t.id !== transactionToDelete))
      setDeleteModalOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      alert('Error al eliminar transacción')
    }
  }

  const openModal = (url) => {
    setSelectedReceipt(url)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReceipt('')
  }

  const triggerUpload = (id) => {
    setUploadingId(id)
    fileInputRef.current.click()
  }

  const handleExistingFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingId) return

    setUploading(true)
    try {
      const file = e.target.files[0]
      const compressedFile = await compressImage(file, 20)

      const fileExt = 'jpg'
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('file')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('file')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ receipt_url: publicUrl })
        .eq('id', uploadingId)

      if (updateError) throw updateError

      fetchTransactions()
    } catch (error) {
      console.error(error)
      alert('Error al subir comprobante')
    } finally {
      setUploading(false)
      setUploadingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(transactions.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

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
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Comprobante (Opcional)</label>
              <input
                id="receipt-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full cursor-pointer rounded border-[1.5px] border-stroke bg-transparent font-medium outline-none transition file:mr-5 file:border-collapse file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-stroke file:bg-whiter file:py-3 file:px-5 file:hover:bg-primary file:hover:bg-opacity-10 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:file:border-form-strokedark dark:file:bg-white/30 dark:file:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="flex w-full md:w-auto justify-center rounded bg-primary p-3 px-6 text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
              disabled={!selectedBudgetId || uploading}
            >
              {uploading ? 'Guardando...' : (
                <>
                  <Plus className="w-5 h-5 mr-2" /> Agregar Transacción
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Transactions List */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                  Fecha
                </th>
                <th className="min-w-[200px] py-4 px-4 font-medium text-black dark:text-white">
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
              {currentTransactions.map((t) => (
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
                      {t.receipt_url ? (
                        <button
                          onClick={() => openModal(t.receipt_url)}
                          className="hover:text-primary"
                          title="Ver Comprobante"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerUpload(t.id)}
                          className="hover:text-primary"
                          title="Adjuntar Comprobante"
                          disabled={uploading}
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="hover:text-danger"
                        title="Eliminar"
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


        {/* Pagination Controls */}
        {transactions.length > itemsPerPage && (
          <div className="flex justify-between items-center p-4 border-t border-stroke dark:border-strokedark">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-gray-200 dark:bg-meta-4 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-opacity-80"
            >
              Anterior
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`px-3 py-1 rounded ${currentPage === number
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-meta-4 hover:bg-gray-300 dark:hover:bg-opacity-80'
                    }`}
                >
                  {number}
                </button>
              ))}
            </div>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-gray-200 dark:bg-meta-4 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-opacity-80"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input for Existing Transactions */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleExistingFileUpload}
      />

      {/* Image Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-boxdark rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-stroke dark:border-strokedark">
                <h3 className="text-xl font-semibold text-black dark:text-white">Comprobante</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-black dark:hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-100 dark:bg-meta-4">
                <img src={selectedReceipt} alt="Comprobante" className="max-w-full max-h-[70vh] object-contain rounded" />
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteModalOpen && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-4">Confirmar Eliminación</h3>
              <p className="text-gray-500 mb-6">¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded border border-stroke text-black hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded bg-danger text-white hover:bg-opacity-90"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
