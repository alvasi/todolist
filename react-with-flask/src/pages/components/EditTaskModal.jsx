import React from 'react'
import calendarIcon from "../../assets/calendar.svg"

function EditTaskModal({ show, onClose, onSubmit, editFormData, setEditFormData }) {
  if (!show) return null
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Task</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="edit-title">Title *</label>
            <input
              id="edit-title"
              type="text"
              value={editFormData.title}
              onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={editFormData.task_description}
              onChange={(e) => setEditFormData({...editFormData, task_description: e.target.value})}
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-due-date">Due Date</label>
            <input
              id="edit-due-date"
              type="date"
              value={editFormData.due_date}
              onChange={(e) => setEditFormData({...editFormData, due_date: e.target.value})}
            />
            <span className="calendar-icon"><img src={calendarIcon}></img></span>
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              value={editFormData.task_status}
              onChange={(e) => setEditFormData({...editFormData, task_status: e.target.value})}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-priority">Priority</label>
            <select
              id="edit-priority"
              value={editFormData.task_priority}
              onChange={(e) => setEditFormData({...editFormData, task_priority: e.target.value})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-private">
              <input
                id="edit-private"
                type="checkbox"
                checked={editFormData.is_private}
                onChange={(e) => setEditFormData({...editFormData, is_private: e.target.checked})}
              />
              Private Task
            </label>
          </div>
          
          <div className="modal-buttons">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Update Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTaskModal