import React from 'react'

function ActiveSort({ sort, onClearSort }) {
  const hasActiveSort = sort.sort_by !== 'created_at' || sort.sort_order !== 'desc'
  
  if (!hasActiveSort) return null
  
  const getSortDisplay = () => {
    const sortByMap = {
      'created_at': 'Created Date',
      'due_date': 'Due Date',
      'title': 'Title',
      'task_status': 'Status',
      'priority': 'Priority'
    }
    
    const sortOrderDisplay = sort.sort_order === 'asc' ? 'Ascending' : 'Descending'
    const sortByDisplay = sortByMap[sort.sort_by] || sort.sort_by
    
    return `${sortByDisplay} (${sortOrderDisplay})`
  }
  
  return (
    <div className="active-filters">
      <strong>Active Sort:</strong>
      <span className="filter-tag">
        {getSortDisplay()}
      </span>
      <button onClick={onClearSort} className="clear-filters">
        Clear Sort
      </button>
    </div>
  )
}

export default ActiveSort