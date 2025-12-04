import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })
console.log('Starting debug script...')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const startOfMonth = `${currentMonth}-01`
  const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString().slice(0, 10)

  console.log(`Checking transactions for ${currentMonth} (${startOfMonth} to ${endOfMonth})`)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startOfMonth)
    .lt('date', endOfMonth)
    .eq('type', 'expense')

  if (error) {
    console.error('Error fetching transactions:', error)
    return
  }

  console.log(`Found ${transactions.length} transactions`)
  if (transactions.length > 0) {
    console.log('Sample transaction:', transactions[0])
  }

  // Check categories
  const { data: categories } = await supabase.from('categories').select('id, name')
  console.log(`Found ${categories.length} categories`)
}

debug()
