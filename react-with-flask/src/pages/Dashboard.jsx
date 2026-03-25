import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [teams, setTeams] = useState([]) // Add teams state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  
  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    task_description: '',
    due_date: '',
    task_status: 'not_started',
    task_priority: 'medium',
    is_private: false,
    team_id: ''
  })
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    team_id: '',
    due_date_from: '',
    due_date_to: ''
  })
  
  // Sort states
  const [sort, setSort] = useState({
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(userData))
    fetchTeams() // Fetch teams first
    fetchTasks()
  }, [filters, sort])

  // Fetch all teams for the current user
  const fetchTeams = async () => {
    try {
      // Include token from localStorage if present (helps when API expects Bearer tokens)
      const userData = JSON.parse(localStorage.getItem('user') || 'null')
      const headers = { 'Content-Type': 'application/json' }
      if (userData?.token) headers.Authorization = `Bearer ${userData.token}`

      const response = await fetch('/api/teams', {
        method: 'GET',
        credentials: 'include',
        headers,
      })

      // Debug logging to help identify whether personal team is returned
      console.log('/api/teams status', response.status)
      const data = await response.json().catch(() => null)
      console.log('/api/teams response', data)

      if (response.ok && data) {
        // Normalize to an array and set teams
        const teamsArr = Array.isArray(data.teams) ? data.teams : data.teams ? [data.teams] : []
        setTeams(teamsArr)
      } else {
        setTeams([])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  // Get team name by ID
  const getTeamName = (teamId) => {
    if (teamId === undefined || teamId === null) return null
    const idStr = String(teamId)
    const team = teams.find((t) => String(t.id) === idStr)
    return team ? team.name : null
  }

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Build query string from filters and sort
      const params = new URLSearchParams()
      
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.team_id) params.append('team_id', filters.team_id)
      if (filters.due_date_from) params.append('due_date_from', filters.due_date_from)
      if (filters.due_date_to) params.append('due_date_to', filters.due_date_to)
      
      params.append('sort_by', sort.sort_by)
      params.append('sort_order', sort.sort_order)
      
      const queryString = params.toString()
      const url = queryString ? `/api/todos?${queryString}` : '/api/todos'
      
      console.log('Fetching tasks from URL:', url)  // Debug
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Tasks response status:', response.status)  // Debug
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      console.log('Raw tasks data:', data)  // Debug
      console.log('Tasks array:', data.tasks)  // Debug
      console.log('Number of tasks:', data.tasks?.length || 0)  // Debug
      
      setTasks(data.tasks || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create task')
      }
      
      // Reset form and close modal
      setNewTask({
        title: '',
        task_description: '',
        due_date: '',
        task_status: 'not_started',
        task_priority: 'medium',
        is_private: false,
        team_id: ''
      })
      setShowAddModal(false)
      
      // Refresh tasks
      fetchTasks()
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Welcome, {user.alias || user.username}!</h1>
          <div className="user-colour" style={{ backgroundColor: user.colour }}></div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowAddModal(true)} className="btn-add">
            + Add Task
          </button>
          <button onClick={() => setShowFilterModal(true)} className="btn-filter">
            Filter
          </button>
          <button onClick={() => setShowSortModal(true)} className="btn-sort">
            Sort
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
          <button onClick={() => fetchTasks()} className="btn-refresh">
            Refresh
          </button>
        </div>
      </header>

      {/* Active Filters Display */}
      {(filters.status || filters.priority || filters.team_id || filters.due_date_from || filters.due_date_to) && (
        <div className="active-filters">
          <strong>Active Filters:</strong>
          {filters.status && <span className="filter-tag">Status: {filters.status.replace('_', ' ')}</span>}
          {filters.priority && <span className="filter-tag">Priority: {filters.priority}</span>}
          {filters.team_id && (
            <span className="filter-tag">
              Team: {getTeamName(filters.team_id) || filters.team_id.slice(0, 8) + '...'}
            </span>
          )}
          {filters.due_date_from && <span className="filter-tag">From: {filters.due_date_from}</span>}
          {filters.due_date_to && <span className="filter-tag">To: {filters.due_date_to}</span>}
          <button onClick={() => setFilters({ status: '', priority: '', team_id: '', due_date_from: '', due_date_to: '' })} className="clear-filters">
            Clear All
          </button>
        </div>
      )}

      {/* Active Sort Display */}
      <div className="active-sort">
        <span id="active-sort-text">{`Sorting: By ${sort.sort_by.replace('_', ' ')} (${sort.sort_order})`}</span>
      </div>

      {/* Tasks List */}
      <div className="tasks-container">
        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="no-tasks">No tasks found. Create your first task!</div>
        ) : (
          <div className="tasks-grid">
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <h3>{task.title}</h3>
                  <span className={`status-badge status-${task.task_status}`}>
                    {task.task_status.replace('_', ' ')}
                  </span>
                </div>
                <p className="task-description">{task.description || 'No description'}</p>
                <div className="task-details">
                  <div className="detail-item">
                    <strong>Due Date:</strong> {task.due_date || 'Not set'}
                  </div>
                  <div className="detail-item">
                    <strong>Priority:</strong>
                    <span className={`priority-badge priority-${task.task_priority}`}>
                      {task.task_priority}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Team:</strong> {getTeamName(task.team_id) || (task.team_id ? String(task.team_id).slice(0, 8) + '...' : 'No team')}
                  </div>
                  <div className="detail-item">
                    <strong>Permission:</strong> {task.permission}
                  </div>
                  {task.is_private && (
                    <div className="detail-item private-badge">🔒 Private</div>
                  )}
                </div>
                <div className="task-meta">
                  <small>Created: {new Date(task.created_at).toLocaleDateString()}</small>
                  <small>Updated: {new Date(task.updated_at).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Task</h2>
            <form onSubmit={handleAddTask}>
              <div className="form-group">
                <label htmlFor="title-input">Title *</label>
                <input
                  id="title-input"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description-input">Description</label>
                <textarea
                  id="description-input"
                  value={newTask.task_description}
                  onChange={(e) => setNewTask({...newTask, task_description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="due-date-input">Due Date</label>
                <input
                  id="due-date-input"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="status-select">Status</label>
                <select
                  id="status-select"
                  value={newTask.task_status}
                  onChange={(e) => setNewTask({...newTask, task_status: e.target.value})}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="priority-select">Priority</label>
                <select
                  id="priority-select"
                  value={newTask.task_priority}
                  onChange={(e) => setNewTask({...newTask, task_priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="private-checkbox">
                  <input
                    id="private-checkbox"
                    type="checkbox"
                    checked={newTask.is_private}
                    onChange={(e) => setNewTask({...newTask, is_private: e.target.checked})}
                  />
                  Private Task
                </label>
              </div>
              
              <div className="form-group">
                <label htmlFor="team-select">Team *</label>
                <select
                  id="team-select"
                  value={newTask.team_id}
                  onChange={(e) => setNewTask({...newTask, team_id: e.target.value})}
                  required
                >
                  <option value="">Select a team</option>
                  {teams.map(team => (
                    <option key={team.id} value={String(team.id)}>
                      {team.name} {team.is_personal ? '(Personal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Filter Tasks</h2>
            <div className="form-group">
              <label htmlFor="filter-status">Status</label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">All</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="filter-priority">Priority</label>
              <select
                id="filter-priority"
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="filter-team">Team</label>
              <select
                id="filter-team"
                value={filters.team_id}
                onChange={(e) => setFilters({...filters, team_id: e.target.value})}
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="filter-due-from">Due Date From</label>
              <input
                id="filter-due-from"
                type="date"
                value={filters.due_date_from}
                onChange={(e) => setFilters({...filters, due_date_from: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="filter-due-to">Due Date To</label>
              <input
                id="filter-due-to"
                type="date"
                value={filters.due_date_to}
                onChange={(e) => setFilters({...filters, due_date_to: e.target.value})}
              />
            </div>
            
            <div className="modal-buttons">
              <button onClick={() => setShowFilterModal(false)}>Apply</button>
              <button onClick={() => setFilters({ status: '', priority: '', team_id: '', due_date_from: '', due_date_to: '' })}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Modal */}
      {showSortModal && (
        <div className="modal-overlay" onClick={() => setShowSortModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Sort Tasks</h2>
            <div className="form-group">
              <label htmlFor="sort-by-select">Sort By</label>
              <select
                id="sort-by-select"
                value={sort.sort_by}
                onChange={(e) => setSort({...sort, sort_by: e.target.value})}
              >
                <option value="created_at">Created Date</option>
                <option value="due_date">Due Date</option>
                <option value="title">Title</option>
                <option value="task_status">Status</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="sort-order-select">Order</label>
              <select
                id="sort-order-select"
                value={sort.sort_order}
                onChange={(e) => setSort({...sort, sort_order: e.target.value})}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            
            <div className="modal-buttons">
              <button onClick={() => setShowSortModal(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard