import React from 'react'

function SortModal({ show, onClose, sort, setSort }) {
  if (!show) return null
  
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
          <label htmlFor="sort-order-select">Order</label>
          <select
            id="sort-order-select"
            value={sort.sort_order}
            onChange={(e) => setSort({...sort, sort_order: e.target.value})}
          >
            <option value="asc">Ascending (A to Z, oldest first)</option>
            <option value="desc">Descending (Z to A, newest first)</option>
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