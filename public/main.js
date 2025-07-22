// main.js

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const divisionSelect = document.getElementById('division');
  const choristerSelect = document.getElementById('chorister');
  const instrumentTypeSelect = document.getElementById('instrument-type');
  const instrumentNumberSelect = document.getElementById('instrument-number');
  const signoutBtn = document.getElementById('signout-btn');
  const returnInstrumentSelect = document.getElementById('return-instrument');
  const signinBtn = document.getElementById('signin-btn');
  const conditionModal = document.getElementById('condition-modal');
  const logsTableBody = document.getElementById('logs-table-body');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  let lastSignInInstrument = null;

  // Fetch and populate divisions
  fetch('/api/divisions')
    .then(res => res.json())
    .then(divisions => {
      divisionSelect.innerHTML = '<option value="">Select Division</option>' +
        divisions.map(d => `<option value="${d}">${d}</option>`).join('');
    });

  // On division change, fetch choristers
  divisionSelect.addEventListener('change', () => {
    const division = divisionSelect.value;
    if (!division) {
      choristerSelect.innerHTML = '<option value="">Select Name</option>';
      return;
    }
    fetch(`/api/choristers?division=${encodeURIComponent(division)}`)
      .then(res => res.json())
      .then(names => {
        choristerSelect.innerHTML = '<option value="">Select Name</option>' +
          names.map(n => `<option value="${n}">${n}</option>`).join('');
      });
  });

  // Fetch and populate instrument types
  fetch('/api/instrument-types')
    .then(res => res.json())
    .then(types => {
      instrumentTypeSelect.innerHTML = '<option value="">Select Type</option>' +
        types.map(t => `<option value="${t}">${t}</option>`).join('');
    });

  // On instrument type change, fetch available numbers
  instrumentTypeSelect.addEventListener('change', () => {
    const type = instrumentTypeSelect.value;
    if (!type) {
      instrumentNumberSelect.innerHTML = '<option value="">Select Number</option>';
      return;
    }
    fetch(`/api/instruments?type=${encodeURIComponent(type)}`)
      .then(res => res.json())
      .then(numbers => {
        instrumentNumberSelect.innerHTML = '<option value="">Select Number</option>' +
          numbers.map(n => `<option value="${n}">${n}</option>`).join('');
      });
  });

  // Sign out instrument
  signoutBtn.addEventListener('click', () => {
    const division = divisionSelect.value;
    const chorister = choristerSelect.value;
    const type = instrumentTypeSelect.value;
    const number = instrumentNumberSelect.value;
    if (!division || !chorister || !type || !number) {
      alert('Please fill all fields to sign out an instrument.');
      return;
    }
    fetch('/api/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division,
        chorister_name: chorister,
        instrument_type: type,
        instrument_number: number
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Instrument signed out successfully!');
          instrumentTypeSelect.dispatchEvent(new Event('change'));
          loadLogs();
          loadReturnInstruments();
        } else {
          alert('Error signing out instrument.');
        }
      });
  });

  // Load instruments available for return (signed out, not yet signed in)
  function loadReturnInstruments() {
    fetch('/api/logs')
      .then(res => res.json())
      .then(logs => {
        // Only show instruments not yet signed in
        const unsignedIn = logs.filter(l => !l.sign_in_time);
        returnInstrumentSelect.innerHTML = '<option value="">Select Instrument</option>' +
          unsignedIn.map(l => `<option value="${l.instrument_number}">${l.instrument_type} - ${l.instrument_number} (${l.chorister_name})</option>`).join('');
      });
  }
  loadReturnInstruments();

  // Show modal for condition on sign in
  signinBtn.addEventListener('click', () => {
    const instrumentNumber = returnInstrumentSelect.value;
    if (!instrumentNumber) {
      alert('Select an instrument to return.');
      return;
    }
    lastSignInInstrument = instrumentNumber;
    conditionModal.classList.remove('hidden');
  });

  // Handle condition selection
  conditionModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('condition-btn')) {
      const condition = e.target.getAttribute('data-condition');
      fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_number: lastSignInInstrument,
          condition_returned: condition
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert('Instrument signed in successfully!');
            loadLogs();
            loadReturnInstruments();
            instrumentTypeSelect.dispatchEvent(new Event('change'));
          } else {
            alert('Error signing in instrument.');
          }
        });
      conditionModal.classList.add('hidden');
    } else if (e.target === conditionModal) {
      // Click outside modal to close
      conditionModal.classList.add('hidden');
    }
  });

  // Load logs
  function loadLogs(search = '') {
    fetch('/api/logs' + (search ? `?search=${encodeURIComponent(search)}` : ''))
      .then(res => res.json())
      .then(logs => {
        logsTableBody.innerHTML = logs.map(log => `
          <tr>
            <td class="p-2 border">${log.division}</td>
            <td class="p-2 border">${log.chorister_name}</td>
            <td class="p-2 border">${log.instrument_type}</td>
            <td class="p-2 border">${log.instrument_number}</td>
            <td class="p-2 border">${log.sign_out_time ? new Date(log.sign_out_time).toLocaleString() : ''}</td>
            <td class="p-2 border">${log.sign_in_time ? new Date(log.sign_in_time).toLocaleString() : ''}</td>
            <td class="p-2 border">${log.condition_returned || ''}</td>
          </tr>
        `).join('');
      });
  }
  loadLogs();

  // Search functionality
  searchBtn.addEventListener('click', () => {
    loadLogs(searchInput.value);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadLogs(searchInput.value);
  });
}); 