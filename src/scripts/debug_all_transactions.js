import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('Fetching ALL transactions (no filters)...')
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total Transactions Found: ${transactions.length}`)
  if (transactions.length > 0) {
    console.log('--- First 5 Transactions ---')
    transactions.slice(0, 5).forEach(t => {
      console.log(`ID: ${t.id} | Date: ${t.date} | Amount: ${t.amount} | Type: ${t.type}`)
    })
  } else {
    console.log('No transactions found in the database.')
  }
}

debug()
