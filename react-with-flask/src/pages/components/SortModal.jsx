import React from 'react'

function SortModal({ show, onClose, sort, setSort }) {
  if (!show) return null

  // Get order options based on sort field
  const getOrderOptions = () => {
    const sortBy = sort.sort_by
    
    const options = {
      created_at: {
        label: 'Order by date',
        asc: 'Oldest to Newest',
        desc: 'Newest to Oldest'
      },
      due_date: {
        label: 'Order by due date',
        asc: 'Earliest to Latest',
        desc: 'Latest to Earliest'
      },
      title: {
        label: 'Order alphabetically',
        asc: 'A to Z',
        desc: 'Z to A'
      },
      task_status: {
        label: 'Order by completion',
        asc: 'Archived → Complete → In Progress → Not Started',
        desc: 'Not Started → In Progress → Complete → Archived',
      },
      priority: {
        label: 'Order by priority',
        asc: 'Lowest to Highest',
        desc: 'Highest to Lowest'
      }
    }
    
    return options[sortBy] || {
      label: 'Order',
      asc: 'Ascending',
      desc: 'Descending'
    }
  }

  const orderOptions = getOrderOptions()

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <label htmlFor="sort-order-select">{orderOptions.label}</label>
          <select
            id="sort-order-select"
            value={sort.sort_order}
            onChange={(e) => setSort({...sort, sort_order: e.target.value})}
          >
            <option value="asc">{orderOptions.asc}</option>
            <option value="desc">{orderOptions.desc}</option>
          </select>
        </div>
        
        <div className="modal-buttons">
          <button onClick={() => setSort({ sort_by: 'created_at', sort_order: 'desc' })}>
            Reset to Default
          </button>
          <button onClick={onClose}>Apply</button>
        </div>
      </div>
    </div>
  )
}

export default SortModal