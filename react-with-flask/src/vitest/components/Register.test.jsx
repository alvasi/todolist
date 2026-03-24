import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Register from '../../pages/Register'

// Mock the useNavigate hook
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('Register Component', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks()
        mockFetch.mockClear()
        mockNavigate.mockClear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const renderRegister = () => {
        return render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        )
    }

    describe('Rendering', () => {
        it('should render the registration form', () => {
            renderRegister()
            // clear any previous navigate calls that might leak between tests
            mockNavigate.mockClear()

            // header text and button both contain 'Register' so target the heading explicitly
            expect(
                screen.getByRole('heading', { name: 'Register' })
            ).toBeInTheDocument()
            expect(screen.getByLabelText('username:')).toBeInTheDocument()
            expect(screen.getByLabelText('password:')).toBeInTheDocument()
            expect(screen.getByLabelText('alias:')).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Register' })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Already have an account?')
            ).toBeInTheDocument()
        })

        it('should show loading state when submitting', async () => {
            // Mock a delayed response that resolves to a response-like object
            mockFetch.mockImplementationOnce(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    ok: true,
                                    json: async () => ({ message: 'delayed' }),
                                }),
                            100
                        )
                    )
            )

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            // Button should show loading text
            expect(screen.getByText('Registering...')).toBeInTheDocument()
            expect(submitButton).toBeDisabled()
        })
    })

    describe('Form Input Handling', () => {
        it('should update username input value', async () => {
            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            await userEvent.type(usernameInput, 'testuser')

            expect(usernameInput).toHaveValue('testuser')
        })

        it('should update password input value', async () => {
            renderRegister()

            const passwordInput = screen.getByLabelText('password:')
            await userEvent.type(passwordInput, 'password123')

            expect(passwordInput).toHaveValue('password123')
        })

        it('should update alias input value', async () => {
            renderRegister()

            const aliasInput = screen.getByLabelText('alias:')
            await userEvent.type(aliasInput, 'Test Alias')

            expect(aliasInput).toHaveValue('Test Alias')
        })

        it('should submit form with correct data', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'User registered successfully',
                    user_id: 1,
                }),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const aliasInput = screen.getByLabelText('alias:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            await userEvent.type(aliasInput, 'Test Alias')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: 'testuser',
                        password: 'password123',
                        alias: 'Test Alias',
                    }),
                })
            })
        })
    })

    describe('API Response Handling', () => {
        it('should show success message and redirect on successful registration', async () => {
            // Mock successful response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'User registered successfully',
                    user_id: 1,
                }),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            // Check success message
            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Registration successful! Redirecting to login...'
                    )
                ).toBeInTheDocument()
            })

            // Check that navigate was called after timeout
            await waitFor(
                () => {
                    expect(mockNavigate).toHaveBeenCalledWith('/login')
                },
                { timeout: 2500 }
            )
        })

        it('should show error message when username already exists', async () => {
            // Mock 409 conflict response
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => ({ message: 'Username already taken' }),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'existinguser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(
                    screen.getByText('Username already taken')
                ).toBeInTheDocument()
            })

            // Ensure navigate was not called during this test (clear any prior calls first)
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it('should show generic error message when API returns error without message', async () => {
            // Mock error response without message
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({}),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(
                    screen.getByText('Registration failed')
                ).toBeInTheDocument()
            })
        })

        it('should show network error message when fetch fails', async () => {
            // Mock network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'))

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(
                    screen.getByText('Network error. Please try again.')
                ).toBeInTheDocument()
            })
        })
    })

    describe('Form Validation', () => {
        it('should not submit if username is empty', async () => {
            renderRegister()

            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            // Form should not submit due to HTML5 validation
            expect(mockFetch).not.toHaveBeenCalled()
        })

        it('should not submit if password is empty', async () => {
            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            fireEvent.click(submitButton)

            // Form should not submit due to HTML5 validation
            expect(mockFetch).not.toHaveBeenCalled()
        })

        it('should allow submission with empty alias', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Success', user_id: 1 }),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'testuser',
                        password: 'password123',
                        alias: '',
                    }),
                })
            })
        })
    })

    describe('Navigation', () => {
        it('should navigate to login page when clicking login link', async () => {
            renderRegister()

            const loginLink = screen.getByText('Login here')
            fireEvent.click(loginLink)

            expect(mockNavigate).toHaveBeenCalledWith('/login')
        })
    })

    describe('Error Recovery', () => {
        it('should clear previous message on new submission', async () => {
            // First submission fails
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'First error' }),
            })

            renderRegister()

            const usernameInput = screen.getByLabelText('username:')
            const passwordInput = screen.getByLabelText('password:')
            const submitButton = screen.getByRole('button', {
                name: 'Register',
            })

            await userEvent.type(usernameInput, 'testuser')
            await userEvent.type(passwordInput, 'password123')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(screen.getByText('First error')).toBeInTheDocument()
            })

            // Second submission succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Success' }),
            })

            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Registration successful! Redirecting to login...'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.queryByText('First error')
                ).not.toBeInTheDocument()
            })
        })
    })
})
