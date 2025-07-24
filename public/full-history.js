document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('full-logs-table-body');
  fetch('/api/logs')
    .then(res => res.json())
    .then(logs => {
      tableBody.innerHTML = logs.map(log => `
        <tr>
          <td>${log.division || '-'}</td>
          <td>${log.chorister_name || '-'}</td>
          <td>${log.group || '-'}</td>
          <td>${log.phone || '-'}</td>
          <td>${log.instrument_type || '-'}</td>
          <td>${log.instrument_number || '-'}</td>
          <td>${log.sign_out_time ? new Date(log.sign_out_time).toLocaleString() : ''}</td>
          <td>${log.sign_in_time ? new Date(log.sign_in_time).toLocaleString() : ''}</td>
          <td>${log.condition_returned || ''}</td>
        </tr>
      `).join('');
    });
}); 