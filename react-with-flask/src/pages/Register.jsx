import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [alias, setAlias] = useState('')
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    // Keep a ref to the timeout so tests or unmounting components don't leak timers
    const timerRef = useRef(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
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
                // Redirect to login page after 2 seconds
                // store timer so it can be cleared if the component unmounts (avoids test leakage)
                timerRef.current = setTimeout(() => {
                    navigate('/login')
                }, 2000)
            } else {
                setMessage(data.message || 'Registration failed')
            }
        } catch (error) {
            console.error('Error:', error)
            setMessage('Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section id="center">
            <h2>Register</h2>
            <div className="register">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="username">username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <br></br>

                    <label htmlFor="password">password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <br></br>

                    <label htmlFor="alias">alias:</label>
                    <input
                        type="text"
                        id="alias"
                        name="alias"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                    />
                    <br></br>

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>

                    {message && <div className="message">{message}</div>}
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
        </section>
    )
}

export default Register
