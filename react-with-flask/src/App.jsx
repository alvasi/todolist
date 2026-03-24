import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
    // Check if user is authenticated
    const isAuthenticated = () => {
        return localStorage.getItem('user') !== null
    }

    // Protected Route component
    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated()) {
            return <Navigate to="/login" replace />
        }
        return children
    }

    return (
        <>
            <Router>
                <div className="App">
                    <Routes>
                        <Route
                            path="/"
                            element={<Navigate to="/login" replace />}
                        />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </>
    )
}

export default App
