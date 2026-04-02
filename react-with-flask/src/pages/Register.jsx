import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import eyeOff from "../assets/eyeOff.svg"
import eye from '../assets/eye.svg'
import '../assets/Auth.css'

function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [type, setType] = useState('password')
    const [icon, setIcon] = useState(eyeOff)
    const [alias, setAlias] = useState('')
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const timerRef = useRef(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [])

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
        setMessageType('')

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    alias,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage('Registration successful! Redirecting to login...')
                setMessageType('success')
                timerRef.current = setTimeout(() => {
                    navigate('/login')
                }, 2000)
            } else {
                setMessage(data.message || 'Registration failed')
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
        <div className="register-container">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username"></label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Username *"
                    />
                </div>

                <div className="form-group register-password-group">
                    <label htmlFor="password"></label>
                    <div className="register-password-wrapper">
                        <input
                            type={type}
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password *"
                            style={{ paddingRight: '35px' }}
                        />
                        <span 
                            className="register-password-toggle" 
                            onClick={handleToggle}
                        >
                            <img 
                                src={icon} 
                                alt={'toggle password'}
                            />
                        </span>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="alias"></label>
                    <input
                        type="text"
                        id="alias"
                        name="alias"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        placeholder="Alias (Display Name)"
                    />
                </div>

                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register'}
                </button>

                {message && <div className={`message ${messageType === 'success' ? 'success' : 'error'}`}>{message}</div>}
            </form>
            <p>
                Already have an account?{' '}
                <a
                    href="/login"
                    onClick={(e) => {
                        e.preventDefault()
                        navigate('/login')
                    }}
                >
                    Login here
                </a>
            </p>
        </div>
    )
}

export default Register