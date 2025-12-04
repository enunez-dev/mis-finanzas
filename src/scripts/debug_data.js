import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const logFile = path.join(__dirname, 'debug_output.txt')
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  fs.writeFileSync(logFile, '--- DEBUG START ---\n')

  try {
    // 1. Fetch Categories
    const { data: categories, error: catError } = await supabase.from('categories').select('id, name, parent_id')
    if (catError) throw catError
    log(`Categories found: ${categories.length}`)

    // 2. Fetch Transactions (All)
    const { data: transactions, error: txError } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    if (txError) throw txError
    log(`Transactions found: ${transactions.length}`)
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id)
      log(`Tx: ${t.date} | ${t.description} | $${t.amount} | Cat: ${cat ? cat.name : 'Unknown'} (${t.category_id})`)
    })

    // 3. Fetch Budgets for current month
    const currentMonth = new Date().toISOString().slice(0, 7)
    log(`Checking budgets for: ${currentMonth}`)
    const { data: budgets, error: bError } = await supabase
      .from('budgets')
      .select('*, budget_details(*)')
      .eq('month', currentMonth)

    if (bError) throw bError

    if (budgets.length === 0) {
      log('No budget header found for this month.')
    } else {
      const budget = budgets[0]
      log(`Budget ID: ${budget.id}`)
      budget.budget_details.forEach(bd => {
        const cat = categories.find(c => c.id === bd.category_id)
        log(`Budget Detail: Cat ${cat ? cat.name : 'Unknown'} | Amount $${bd.amount}`)
      })
    }

  } catch (e) {
    log(`ERROR: ${e.message}`)
  }
}

debug()
