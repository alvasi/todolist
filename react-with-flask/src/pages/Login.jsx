import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            // Trim inputs and avoid submitting empty/whitespace-only values
            const trimmedUsername = username.trim()
            const trimmedPassword = password.trim()
            if (!trimmedUsername || !trimmedPassword) {
                setIsLoading(false)
                return
            }

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: trimmedUsername,
                    password: trimmedPassword,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                // Store user data in localStorage or context
                localStorage.setItem('user', JSON.stringify(data.user))
                // Redirect to dashboard
                navigate('/dashboard')
            } else {
                setMessage(data.message || 'Login failed')
            }
        } catch (error) {
            console.error('Error:', error)
            setMessage('Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                {message && <div className="message">{message}</div>}
            </form>
            <p>
                Don't have an account?{' '}
                <a
                    href="/register"
                    onClick={(e) => {
                        e.preventDefault()
                        navigate('/register')
                    }}
                >
                    Register here
                </a>
            </p>
        </div>
    )
}

export default Login
