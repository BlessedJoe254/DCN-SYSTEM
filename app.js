// ===== app.js (Deliverance Church System) =====

// 🌐 Base API URL
const apiBase = 'http://localhost:4000/api';
let currentUser = null;
let authToken = localStorage.getItem('token') || '';

// ===== Utility: Set headers =====
function setAuthHeader() {
  return authToken
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }
    : { 'Content-Type': 'application/json' };
}

// ===== DOM Elements =====
const loginPage = document.getElementById('login-page');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');
const toggleLoginLink = document.getElementById('toggle-login');
const toggleRegisterLink = document.getElementById('toggle-register');

// ===== Toggle Forms =====
toggleRegisterLink?.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});
toggleLoginLink?.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// ===== Auth Check =====
async function checkAuth() {
  if (!authToken) {
    loginPage.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    return;
  }
  try {
    const res = await fetch(`${apiBase}/auth/me`, { headers: setAuthHeader() });
    if (!res.ok) throw new Error('Invalid token');
    const data = await res.json();
    currentUser = data.user;
    showDashboard();
  } catch {
    localStorage.removeItem('token');
    authToken = '';
    loginPage.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
  }
}

// ===== LOGIN =====
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!username || !password) return alert('Enter username and password');

  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Login failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    showDashboard();
  } catch (err) {
    console.error('Login failed:', err);
    alert('Login failed.');
  }
});

// ===== REGISTER =====
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const fullname = document.getElementById('reg-fullname')?.value.trim() || '';
  const adminCode = document.getElementById('reg-admin-code')?.value.trim() || '';

  if (!username || !password) return alert('Enter username and password');

  const role = adminCode === '38484692' ? 'admin' : 'user';

  try {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullname, role })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Registration failed');

    alert('✅ Registration successful! Please login.');
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  } catch (err) {
    console.error('Registration failed:', err);
    alert('Registration failed.');
  }
});

// ===== Show Dashboard =====
function showDashboard() {
  loginPage?.classList.add('hidden');
  dashboardContainer?.classList.remove('hidden');
  userGreeting.textContent = `✅ Success! You are now logged in as ${currentUser?.username || 'User'}.`;
  loadMembers();
  loadContributions();
  loadExpenses();
}

// ===== Logout =====
logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('token');
  authToken = '';
  currentUser = null;
  loginPage.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
});

// ===== Navigation =====
document.querySelectorAll('.sidebar nav a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.sidebar nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    const page = a.dataset.page;
    document.getElementById('page-title').textContent =
      page.charAt(0).toUpperCase() + page.slice(1);
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page + '-page').classList.remove('hidden');

    if (page === 'members') loadMembers();
    if (page === 'contributions') loadContributions();
    if (page === 'expenses') loadExpenses();
  });
});

// ===== Display Current Date =====
document.getElementById('today').textContent = new Date().toLocaleDateString();

// ===== Members =====
const membersTableBody = document.querySelector('#members-table tbody');
const ministrySelect = document.getElementById('m-ministry');
const departmentSelect = document.getElementById('m-department');
let editingMemberId = null;

// Populate Ministries
if (ministrySelect) {
  const ministries = [
    "Praise and Worship",
    "Ushering",
    "Media",
    "House Keeping",
    "Hospitality",
    "Nil"
  ];
  ministrySelect.setAttribute('multiple', 'multiple');
  ministrySelect.innerHTML = ministries.map(m => `<option value="${m}">${m}</option>`).join('');
}

// Populate Departments
if (departmentSelect) {
  const departments = [
    "Kingdom Generation",
    "Teenagers",
    "Vijanaz",
    "Women",
    "Men"
  ];
  departmentSelect.innerHTML =
    '<option value="">--Select Department--</option>' +
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
}

// ===== Load Members =====
async function loadMembers() {
  try {
    const res = await fetch(`${apiBase}/members`, { headers: setAuthHeader() });
    const data = await res.json();

    membersTableBody.innerHTML = data.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.firstname} ${m.lastname || ''}</td>
        <td>${m.phone || ''}</td>
        <td>${m.gender || ''}</td>
        <td>${m.ministry || ''}</td>
        <td>${m.department || ''}</td>
        <td>${m.home_location || ''}</td>
        <td>${m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}</td>
        <td>
          <button class="edit-member" data-id="${m.id}" title="Edit Member"><i class="bi bi-pencil-square"></i></button>
          <button class="delete-member" data-id="${m.id}" title="Delete Member"><i class="bi bi-trash-fill"></i></button>
        </td>
      </tr>
    `).join('');

    updateDashboardStats(data);

    const select = document.getElementById('contrib-member');
    if (select) {
      select.innerHTML = '<option value="">--Select member (optional)--</option>' +
        data.map(m => `<option value="${m.id}">${m.firstname} ${m.lastname || ''}</option>`).join('');
    }

    // Delete
    document.querySelectorAll('.delete-member').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to delete this member?')) return;
        try {
          const res = await fetch(`${apiBase}/members/${id}`, {
            method: 'DELETE',
            headers: setAuthHeader()
          });
          if (!res.ok) throw new Error('Failed to delete');
          alert('Member deleted successfully.');
          loadMembers();
        } catch (err) {
          console.error(err);
          alert('Error deleting member.');
        }
      });
    });

    // Edit
    document.querySelectorAll('.edit-member').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const member = data.find(m => m.id == id);
        if (!member) return;

        editingMemberId = id;
        document.getElementById('m-first').value = member.firstname || '';
        document.getElementById('m-last').value = member.lastname || '';
        document.getElementById('m-phone').value = member.phone || '';
        document.getElementById('m-gender').value = member.gender || '';
        document.getElementById('m-department').value = member.department || '';
        document.getElementById('m-home').value = member.home_location || '';

        const selectedMinistries = (member.ministry || '').split(',').map(m => m.trim());
        for (let opt of ministrySelect.options) opt.selected = selectedMinistries.includes(opt.value);

        document.getElementById('member-form').classList.remove('hidden');
        document.getElementById('save-member').innerHTML =
          '<i class="bi bi-save2-fill"></i> Update Member';
      });
    });
  } catch (err) {
    console.error('Failed to load members:', err);
  }
}

// ===== Add / Update Member =====
document.getElementById('add-member-btn').addEventListener('click', () => {
  const f = document.getElementById('member-form');
  f.classList.toggle('hidden');
  editingMemberId = null;
  document.getElementById('save-member').innerHTML =
    '<i class="bi bi-save2-fill"></i> Save Member';
});

document.getElementById('save-member').addEventListener('click', async () => {
  const selectedMinistries = Array.from(ministrySelect.selectedOptions).map(o => o.value);
  const body = {
    firstname: document.getElementById('m-first').value.trim(),
    lastname: document.getElementById('m-last').value.trim(),
    phone: document.getElementById('m-phone').value.trim(),
    gender: document.getElementById('m-gender').value,
    ministry: selectedMinistries.join(', '),
    department: document.getElementById('m-department').value,
    home_location: document.getElementById('m-home').value.trim(),
    joined_at: new Date().toISOString().split('T')[0]
  };

  if (!body.firstname || !body.phone || !body.gender) {
    alert('Please fill in all required fields: First name, Phone, and Gender.');
    return;
  }

  try {
    const method = editingMemberId ? 'PUT' : 'POST';
    const url = editingMemberId
      ? `${apiBase}/members/${editingMemberId}`
      : `${apiBase}/members`;

    await fetch(url, { method, headers: setAuthHeader(), body: JSON.stringify(body) });
    alert(editingMemberId ? 'Member updated successfully.' : 'Member added successfully.');
    ['m-first','m-last','m-phone','m-gender','m-department','m-home'].forEach(id => {
      document.getElementById(id).value = '';
    });
    for (let opt of ministrySelect.options) opt.selected = false;
    editingMemberId = null;
    await loadMembers(); // refresh and update dashboard stats immediately
  } catch (err) {
    console.error('Error saving member:', err);
  }
});

// ===== Dashboard Stats =====
function updateDashboardStats(members) {
  document.getElementById('total-members').textContent = members.length;
  document.getElementById('total-male').textContent = members.filter(m => m.gender === 'Male').length;
  document.getElementById('total-female').textContent = members.filter(m => m.gender === 'Female').length;

  const normalize = val => (val || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

  const ministryKeys = {
    "praise and worship": "ministry-praise",
    "ushering": "ministry-ushering",
    "media": "ministry-media",
    "house keeping": "ministry-housekeeping",
    "hospitality": "ministry-hospitality"
  };

  Object.entries(ministryKeys).forEach(([key, id]) => {
    const count = members.filter(m => normalize(m.ministry).includes(key)).length;
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });

  const deptKeys = {
    "Kingdom Generation": "dept-kg",
    "Teenagers": "dept-teenagers",
    "Vijanaz": "dept-vijanaz",
    "Women": "dept-women",
    "Men": "dept-men"
  };
  Object.entries(deptKeys).forEach(([name, id]) => {
    const count = members.filter(m => m.department === name).length;
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

// ===== Contributions =====
const contribTableBody = document.querySelector('#contrib-table tbody');
document.getElementById('save-contrib').addEventListener('click', async () => {
  const member_id = document.getElementById('contrib-member').value || null;
  const amount = parseFloat(document.getElementById('contrib-amount').value || 0);
  const method = document.getElementById('contrib-method').value || '';
  if (amount <= 0) return alert('Enter a valid amount');

  await fetch(apiBase + '/contributions', {
    method: 'POST',
    headers: setAuthHeader(),
    body: JSON.stringify({ member_id, amount, method })
  });
  document.getElementById('contrib-amount').value = '';
  document.getElementById('contrib-method').value = '';
  loadContributions();
});

async function loadContributions() {
  const res = await fetch(apiBase + '/contributions', { headers: setAuthHeader() });
  const data = await res.json();
  contribTableBody.innerHTML = data.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.firstname ? c.firstname + ' ' + (c.lastname || '') : 'Guest'}</td>
      <td>${c.amount}</td>
      <td>${new Date(c.created_at).toLocaleString()}</td>
    </tr>
  `).join('');

  const total = data.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalContrib = document.getElementById('total-contributions');
  if (totalContrib) totalContrib.textContent = `KES ${total.toFixed(2)}`;
}

// ===== Expenses =====
const expenseTableBody = document.querySelector('#expense-table tbody');
document.getElementById('save-expense').addEventListener('click', async () => {
  const title = document.getElementById('expense-title').value;
  const amount = parseFloat(document.getElementById('expense-amount').value || 0);
  if (!title || amount <= 0) return alert('Title and amount required');

  await fetch(apiBase + '/expenses', {
    method: 'POST',
    headers: setAuthHeader(),
    body: JSON.stringify({ title, amount })
  });
  document.getElementById('expense-title').value = '';
  document.getElementById('expense-amount').value = '';
  loadExpenses();
});

async function loadExpenses() {
  const res = await fetch(apiBase + '/expenses', { headers: setAuthHeader() });
  const data = await res.json();
  expenseTableBody.innerHTML = data.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e.title}</td>
      <td>${e.amount}</td>
      <td>${new Date(e.created_at).toLocaleString()}</td>
    </tr>
  `).join('');

  const total = data.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalExp = document.getElementById('total-expenses');
  if (totalExp) totalExp.textContent = `KES ${total.toFixed(2)}`;
}

// ===== Initialize =====
checkAuth();
