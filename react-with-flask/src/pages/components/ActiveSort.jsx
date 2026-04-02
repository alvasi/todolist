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
    
    // Get concise order display
    const getOrderDisplay = () => {
      const sortBy = sort.sort_by
      const sortOrder = sort.sort_order
      
      const orderMap = {
        created_at: {
          asc: 'Oldest → Newest',
          desc: 'Newest → Oldest'
        },
        due_date: {
          asc: 'Earliest → Latest',
          desc: 'Latest → Earliest'
        },
        title: {
          asc: 'A → Z',
          desc: 'Z → A'
        },
        task_status: {
          asc: 'Archived → Not Started',
          desc: 'Not Started → Archived'
        },
        priority: {
          asc: 'Low → High',
          desc: 'High → Low'
        }
      }
      
      return orderMap[sortBy]?.[sortOrder] || (sortOrder === 'asc' ? '↑' : '↓')
    }
    
    const sortByDisplay = sortByMap[sort.sort_by] || sort.sort_by
    const orderDisplay = getOrderDisplay()
    
    return `${sortByDisplay} (${orderDisplay})`
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