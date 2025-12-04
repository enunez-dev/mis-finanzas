import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Budgets from './components/Budgets'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
