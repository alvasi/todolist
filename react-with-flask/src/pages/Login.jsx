import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import eyeOff from "../assets/eyeOff.svg"
import eye from '../assets/eye.svg'
import '../assets/Auth.css'

function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [type, setType] = useState('password')
    const [icon, setIcon] = useState(eyeOff)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleToggle = () => {
        if (type === 'password') {
            setIcon(eye);
            setType('text')
        } else {
            setIcon(eyeOff)
            setType('password')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            const trimmedUsername = username.trim()
            const trimmedPassword = password.trim()
            if (!trimmedUsername || !trimmedPassword) {
                setIsLoading(false)
                return
            }

            setMessageType('')

            const response = await fetch('/api/login', {
                method: 'POST',
                credentials: 'include',
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
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/dashboard')
            } else {
                setMessage(data.message || 'Login failed')
                setMessageType('error')
            }
        } catch (error) {
            console.error('Error:', error)
            setMessage('Network error. Please try again.')
            setMessageType('error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username"></label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Username"
                    />
                </div>
                <div className="form-group login-password-group">
                    <label htmlFor="password"></label>
                    <div className="login-password-wrapper">
                        <input
                            id="password"
                            name="password"
                            type={type}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                        />
                        <span className="login-password-toggle" onClick={handleToggle}>
                            <img 
                                src={icon} 
                                alt={'toggle password'}
                            />
                        </span>
                    </div>
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                {message && <div className={`message ${messageType === 'success' ? 'success' : 'error'}`}>{message}</div>}
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