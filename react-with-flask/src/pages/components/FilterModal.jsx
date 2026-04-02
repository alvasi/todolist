import React from 'react'
import calendarIcon from "../../assets/calendar.svg"

function FilterModal({ show, onClose, filters, setFilters, teams }) {
  if (!show) return null
  
  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <span className="calendar-icon"><img src={calendarIcon}></img></span>
        </div>
        
        <div className="form-group">
          <label htmlFor="filter-due-to">Due Date To</label>
          <input
            id="filter-due-to"
            type="date"
            value={filters.due_date_to}
            onChange={(e) => setFilters({...filters, due_date_to: e.target.value})}
          />
          <span className="calendar-icon"><img src={calendarIcon}></img></span>
        </div>
        
        <div className="modal-buttons">
          <button onClick={onClose}>Apply</button>
          <button onClick={() => setFilters({ status: '', priority: '', team_id: '', due_date_from: '', due_date_to: '' })}>
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterModal