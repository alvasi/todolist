import React from 'react'

function ActiveSort({ sort }) {
  return (
    <div className="active-sort">
      <span id="active-sort-text">
        {`Sorting: By ${sort.sort_by.replace('_', ' ')} (${sort.sort_order})`}
      </span>
    </div>
  )
}

export default ActiveSort