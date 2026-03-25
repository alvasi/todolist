import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/Dashboard.css'
import DashboardHeader from '../pages/components/DashboardHeader'
import TaskCard from '../pages/components/TaskCard'
import AddTaskModal from '../pages/components/AddTaskModal'
import EditTaskModal from '../pages/components/EditTaskModal'
import FilterModal from '../pages/components/FilterModal'
import SortModal from '../pages/components/SortModal'
import ActiveFilters from '../pages/components/ActiveFilters'
import ActiveSort from '../pages/components/ActiveSort'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    task_description: '',
    due_date: '',
    task_status: '',
    task_priority: '',
    is_private: false
  })
  
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
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(userData))
    fetchTeams()
    fetchTasks()
  }, [filters, sort])

  const fetchTeams = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || 'null')
      const headers = { 'Content-Type': 'application/json' }
      if (userData?.token) headers.Authorization = `Bearer ${userData.token}`

      const response = await fetch('/api/teams', {
        method: 'GET',
        credentials: 'include',
        headers,
      })

      const data = await response.json().catch(() => null)

      if (response.ok && data) {
        const teamsArr = Array.isArray(data.teams) ? data.teams : data.teams ? [data.teams] : []
        setTeams(teamsArr)
      } else {
        setTeams([])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

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
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
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
      fetchTasks()
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task. Please try again.')
    }
  }

  const handleEditTask = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/todos/${editingTask.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 403) {
          alert('You do not have permission to edit this task')
        } else {
          alert(data.message || 'Failed to update task')
        }
        return
      }
      
      setShowEditModal(false)
      setEditingTask(null)
      setEditFormData({
        title: '',
        task_description: '',
        due_date: '',
        task_status: '',
        task_priority: '',
        is_private: false
      })
      fetchTasks()
    } catch (err) {
      console.error('Error updating task:', err)
      alert('Failed to update task. Please try again.')
    }
  }

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${taskTitle}"?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/todos/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 403) {
          alert('Only task owners can delete tasks')
        } else {
          alert(data.message || 'Failed to delete task')
        }
        return
      }
      
      fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task. Please try again.')
    }
  }

  const openEditModal = (task) => {
    if (task.permission !== 'edit' && task.permission !== 'owner') {
      alert('You do not have permission to edit this task')
      return
    }
    
    setEditingTask(task)
    setEditFormData({
      title: task.title,
      task_description: task.description || '',
      due_date: task.due_date || '',
      task_status: task.task_status,
      task_priority: task.task_priority,
      is_private: task.is_private
    })
    setShowEditModal(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      team_id: '',
      due_date_from: '',
      due_date_to: ''
    })
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <DashboardHeader
        user={user}
        onAddTask={() => setShowAddModal(true)}
        onFilter={() => setShowFilterModal(true)}
        onSort={() => setShowSortModal(true)}
        onLogout={handleLogout}
        onRefresh={fetchTasks}
      />

      <ActiveFilters
        filters={filters}
        getTeamName={getTeamName}
        onClearFilters={clearFilters}
      />

      <ActiveSort sort={sort} />

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
              <TaskCard
                key={task.id}
                task={task}
                getTeamName={getTeamName}
                onEdit={openEditModal}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      <AddTaskModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
        newTask={newTask}
        setNewTask={setNewTask}
        teams={teams}
      />

      <EditTaskModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditTask}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
      />

      <FilterModal
        show={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        setFilters={setFilters}
        teams={teams}
      />

      <SortModal
        show={showSortModal}
        onClose={() => setShowSortModal(false)}
        sort={sort}
        setSort={setSort}
      />
    </div>
  )
}

export default Dashboard