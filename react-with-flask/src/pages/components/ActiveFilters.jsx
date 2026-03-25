import React from 'react'

function ActiveFilters({ filters, getTeamName, onClearFilters }) {
  const hasFilters = filters.status || filters.priority || filters.team_id || filters.due_date_from || filters.due_date_to
  
  if (!hasFilters) return null
  
  return (
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
      <button onClick={onClearFilters} className="clear-filters">
        Clear All
      </button>
    </div>
  )
}

export default ActiveFilters