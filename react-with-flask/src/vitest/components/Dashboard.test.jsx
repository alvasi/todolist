import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'

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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
globalThis.localStorage = localStorageMock

describe('Dashboard Component', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    username: 'testuser',
    alias: 'Test User',
    colour: '#000000'
  }

  const mockTeams = [
    { id: 'team-1', name: 'Personal', is_personal: true, role: 'owner' },
    { id: 'team-2', name: 'Work Team', is_personal: false, role: 'member' }
  ]

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Task 1',
      description: 'Description 1',
      due_date: '2026-12-31',
      task_status: 'in_progress',
      task_priority: 'high',
      is_private: false,
      team_id: 'team-1',
      team_name: 'Personal',
      permission: 'owner',
      created_at: '2026-03-25T00:00:00Z',
      updated_at: '2026-03-25T00:00:00Z'
    },
    {
      id: 'task-2',
      title: 'Task 2',
      description: 'Description 2',
      due_date: '2026-12-30',
      task_status: 'not_started',
      task_priority: 'medium',
      is_private: true,
      team_id: 'team-2',
      team_name: 'Work Team',
      permission: 'edit',
      created_at: '2026-03-24T00:00:00Z',
      updated_at: '2026-03-24T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    mockNavigate.mockClear()
    localStorageMock.getItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Setup localStorage mock
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))
    
    // Setup fetch mocks
    mockFetch.mockImplementation((url) => {
      if (url === '/api/teams') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teams: mockTeams })
        })
      }
      if (url === '/api/todos' || url.startsWith('/api/todos?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: mockTasks })
        })
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )
  }

  describe('Authentication', () => {
    it('should redirect to login if no user in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      renderDashboard()
      
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should load user data from localStorage', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
      })
    })
  })

  describe('Rendering', () => {
    it('should render the dashboard header', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
        expect(screen.getByText('+ Add Task')).toBeInTheDocument()
        expect(screen.getByText('Filter')).toBeInTheDocument()
        expect(screen.getByText('Sort')).toBeInTheDocument()
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })
    })

    it('should render tasks after loading', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument()
        expect(screen.getByText('Task 2')).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching tasks', () => {
      renderDashboard()
      
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument()
    })

    it('should show "No tasks" message when tasks array is empty', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/teams') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ teams: mockTeams })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] })
        })
      })
      
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('No tasks found. Create your first task!')).toBeInTheDocument()
      })
    })

    it('should show error message when fetch fails', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'))
      })
      
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load tasks. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Task Creation Modal', () => {
    it('should open add task modal when clicking Add Task button', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Task')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('+ Add Task'))
      
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Team *')).toBeInTheDocument()
    })

    it('should close modal when clicking cancel', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Task')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('+ Add Task'))
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Cancel'))
      
      await waitFor(() => {
        expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
      })
    })

    it('should submit new task with correct data', async () => {
      const createTaskMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Task created', task_id: 'new-task' })
      })
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/teams') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ teams: mockTeams })
          })
        }
        if (url === '/api/todos' && options?.method === 'POST') {
          return createTaskMock()
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: mockTasks })
        })
      })
      
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Task')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('+ Add Task'))
      
      // Fill form
      await userEvent.type(screen.getByLabelText('Title *'), 'New Test Task')
      await userEvent.type(screen.getByLabelText('Description'), 'Test description')
      await userEvent.selectOptions(screen.getByLabelText('Team *'), 'team-1')
      
      fireEvent.click(screen.getByText('Create Task'))
      
      await waitFor(() => {
        expect(createTaskMock).toHaveBeenCalled()
      })
    })
  })

  describe('Filter Modal', () => {
    it('should open filter modal when clicking Filter button', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Filter')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Filter'))
      
      expect(screen.getByText('Filter Tasks')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      expect(screen.getByLabelText('Priority')).toBeInTheDocument()
      expect(screen.getByLabelText('Team')).toBeInTheDocument()
    })

    it('should apply status filter', async () => {
      const fetchTasksMock = vi.fn()
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Filter')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Filter'))
      
      await userEvent.selectOptions(screen.getByLabelText('Status'), 'in_progress')
      fireEvent.click(screen.getByText('Apply'))
      
      await waitFor(() => {
        expect(screen.getByText('Active Filters:')).toBeInTheDocument()
        expect(screen.getByText('Status: in progress')).toBeInTheDocument()
      })
    })

    it('should clear all filters', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Filter')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Filter'))
      await userEvent.selectOptions(screen.getByLabelText('Status'), 'in_progress')
      fireEvent.click(screen.getByText('Apply'))
      
      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Clear All'))
      
      await waitFor(() => {
        expect(screen.queryByText('Status: in progress')).not.toBeInTheDocument()
      })
    })
  })

  describe('Sort Modal', () => {
    it('should open sort modal when clicking Sort button', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Sort')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Sort'))
      
      expect(screen.getByText('Sort Tasks')).toBeInTheDocument()
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
      expect(screen.getByLabelText('Order')).toBeInTheDocument()
    })

    it('should apply sort by title ascending', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Sort')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Sort'))
      await userEvent.selectOptions(screen.getByLabelText('Sort By'), 'title')
      await userEvent.selectOptions(screen.getByLabelText('Order'), 'asc')
      fireEvent.click(screen.getByText('Apply'))
      
      await waitFor(() => {
        expect(screen.getByText('Sorting: By title (asc)')).toBeInTheDocument()
      })
    })
  })

  describe('Logout', () => {
    it('should logout and redirect to login', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Logout'))
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Team Display', () => {
    it('should display team names correctly', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument()
        expect(screen.getByText('Personal')).toBeInTheDocument()
        expect(screen.getByText('Work Team')).toBeInTheDocument()
      })
    })
  })

  describe('Task Details', () => {
    it('should display task status badges', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('in progress')).toBeInTheDocument()
        expect(screen.getByText('not started')).toBeInTheDocument()
      })
    })

    it('should display task priority badges', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText('medium')).toBeInTheDocument()
      })
    })

    it('should display private badge for private tasks', async () => {
      renderDashboard()
      
      await waitFor(() => {
        const privateBadges = screen.getAllByText('🔒 Private')
        expect(privateBadges.length).toBe(1)
      })
    })
  })
})