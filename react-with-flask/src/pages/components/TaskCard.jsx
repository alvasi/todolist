import React from 'react'

function TaskCard({ task, getTeamName, onEdit, onDelete }) {
  const canEdit = task.permission === 'edit' || task.permission === 'owner'
  
  return (
    <div 
      className="task-card"
      // Always forward the click to the parent handler so the page-level
      // permission check can decide whether to open the edit modal or show
      // an alert. TaskCard still visually indicates whether editing is
      // available via the cursor style.
      onClick={() => onEdit && onEdit(task)}
      style={{ cursor: canEdit ? 'pointer' : 'default' }}
    >
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
      {task.permission === 'owner' && (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id, task.title)
          }}
          className="btn-delete"
        >
          🗑️ Delete
        </button>
      )}
    </div>
  )
}

export default TaskCard