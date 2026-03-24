import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../pages/Login'

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

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    mockNavigate.mockClear()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
  }

  describe('Rendering', () => {
    it('should render the login form', () => {
      renderLogin()
      
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByLabelText('Username:')).toBeInTheDocument()
      expect(screen.getByLabelText('Password:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(screen.getByText('Register here')).toBeInTheDocument()
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
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Logging in...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Input Handling', () => {
    it('should update username input value', async () => {
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      await userEvent.type(usernameInput, 'testuser')
      
      expect(usernameInput).toHaveValue('testuser')
    })

    it('should update password input value', async () => {
      renderLogin()
      
      const passwordInput = screen.getByLabelText('Password:')
      await userEvent.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('should submit form with correct data', async () => {
      const mockUser = { id: 1, username: 'testuser', alias: 'Test User', colour: '#000000' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
          json: () => Promise.resolve({ message: 'Login successful', user: mockUser })
      })
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'testuser',
            password: 'password123'
          })
        })
      })
    })
  })

  describe('API Response Handling', () => {
    const mockUser = { id: 1, username: 'testuser', alias: 'Test User', colour: '#000000' }

    it('should store user data in localStorage and redirect on successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
          json: () => Promise.resolve({ message: 'Login successful', user: mockUser })
      })
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        // Check localStorage
        const storedUser = localStorage.getItem('user')
        expect(storedUser).toBe(JSON.stringify(mockUser))
      })
      
      await waitFor(() => {
        // Check navigation
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show error message when login fails with invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid username or password' })
      })
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'wrongpassword')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument()
      })
      
      // Verify navigate was not called
      expect(mockNavigate).not.toHaveBeenCalled()
      // Verify localStorage was not set
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('should show generic error message when API returns error without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      })
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should show network error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should not submit if username is empty', async () => {
      renderLogin()
      
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      // Form should not submit due to HTML5 validation
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not submit if password is empty', async () => {
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      fireEvent.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not submit if both fields are empty', async () => {
      renderLogin()
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      fireEvent.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('should navigate to register page when clicking register link', async () => {
      renderLogin()
      
      const registerLink = screen.getByText('Register here')
      fireEvent.click(registerLink)
      
      expect(mockNavigate).toHaveBeenCalledWith('/register')
    })
  })

  describe('Error Recovery', () => {
    it('should clear previous message on new submission', async () => {
      // First submission fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'First error' })
      })
      
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })
      
      // Second submission succeeds
      const mockUser = { id: 1, username: 'testuser', alias: 'Test User', colour: '#000000' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Login successful', user: mockUser })
      })
      
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string username', async () => {
      renderLogin()
      
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle empty string password', async () => {
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      fireEvent.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only username', async () => {
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, '   ')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)
      
      // HTML5 validation will catch this since input is required
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only password', async () => {
      renderLogin()
      
      const usernameInput = screen.getByLabelText('Username:')
      const passwordInput = screen.getByLabelText('Password:')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await userEvent.type(usernameInput, 'testuser')
      await userEvent.type(passwordInput, '   ')
      fireEvent.click(submitButton)
      
      // HTML5 validation will catch this since input is required
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})