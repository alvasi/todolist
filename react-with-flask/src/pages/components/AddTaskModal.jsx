import React from 'react'

function AddTaskModal({ show, onClose, onSubmit, newTask, setNewTask, teams }) {
  if (!show) return null
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Task</h2>
        <form onSubmit={onSubmit}>
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
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTaskModal