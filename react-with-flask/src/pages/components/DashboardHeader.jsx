import React from 'react'

function DashboardHeader({ user, onAddTask, onFilter, onSort, onLogout }) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>Welcome, {user.alias || user.username}!</h1>
      </div>
      <div className="header-right">
        <button onClick={onAddTask} className="btn-add">
          + Add Task
        </button>
        <button onClick={onFilter} className="btn-filter">
          Filter
        </button>
        <button onClick={onSort} className="btn-sort">
          Sort
        </button>
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader