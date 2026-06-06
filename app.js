import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const demoLabs = [
  {
    title: 'Projectile Motion Arena',
    subject: 'Physics',
    classLevel: '11',
    category: 'JEE',
    difficulty: 'Advanced',
    imageUrl: '',
    labUrl: 'https://example.com/projectile.html',
    description: 'Launch a projectile, adjust angle and speed, and visualize range, height and time of flight.',
    tags: ['motion', 'vectors', 'graph'],
    featured: true,
    createdAt: new Date()
  },
  {
    title: 'Ohm’s Law Circuit Builder',
    subject: 'Physics',
    classLevel: '10',
    category: 'NCERT',
    difficulty: 'Foundation',
    imageUrl: '',
    labUrl: 'https://example.com/ohms-law.html',
    description: 'Build circuits and observe how voltage, current and resistance are related in real time.',
    tags: ['electricity', 'circuit'],
    featured: true,
    createdAt: new Date()
  },
  {
    title: 'Cell Explorer 3D',
    subject: 'Biology',
    classLevel: '8',
    category: 'NEET',
    difficulty: 'Intermediate',
    imageUrl: '',
    labUrl: 'https://example.com/cell.html',
    description: 'Explore cell organelles with labels, quizzes and guided concept-building activities.',
    tags: ['cell', 'organelles'],
    featured: false,
    createdAt: new Date()
  }
];

const state = {
  labs: [],
  filtered: [],
  page: 1,
  pageSize: 9,
  layout: 'grid',
  settings: { columns: 3, rows: 3, maxLabs: 9 },
  user: null,
  isAdmin: false,
  firebaseReady: false
};

const $ = (id) => document.getElementById(id);
const classFilter = $('classFilter');
const classLevel = $('classLevel');

for (let i = 1; i <= 12; i++) {
  classFilter.insertAdjacentHTML('beforeend', `<option value="${i}">Class ${i}</option>`);
  classLevel.insertAdjacentHTML('beforeend', `<option value="${i}">Class ${i}</option>`);
}

const configLooksReady = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE_');
let app, auth, db;

if (configLooksReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  state.firebaseReady = true;
}

function toast(message) {
  alert(message);
}

function isAllowedAdmin(user) {
  return !!user?.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
}

function normalizeLab(lab) {
  return {
    id: lab.id || crypto.randomUUID(),
    title: lab.title?.trim() || 'Untitled Lab',
    subject: lab.subject || 'Physics',
    classLevel: String(lab.classLevel || '1'),
    category: lab.category || 'NCERT',
    difficulty: lab.difficulty || 'Foundation',
    imageUrl: lab.imageUrl || '',
    labUrl: lab.labUrl || '#',
    description: lab.description || '',
    tags: Array.isArray(lab.tags) ? lab.tags : String(lab.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    featured: !!lab.featured,
    createdAt: lab.createdAt || new Date()
  };
}

function loadLocalData() {
  const savedLabs = JSON.parse(localStorage.getItem('ncertLabs.labs') || 'null');
  const savedSettings = JSON.parse(localStorage.getItem('ncertLabs.settings') || 'null');
  state.labs = (savedLabs || demoLabs).map(normalizeLab);
  if (savedSettings) state.settings = savedSettings;
  applySettingsToUI();
  applyFilters();
  renderAdminList();
}

function saveLocalData() {
  localStorage.setItem('ncertLabs.labs', JSON.stringify(state.labs));
  localStorage.setItem('ncertLabs.settings', JSON.stringify(state.settings));
}

function connectFirebase() {
  if (!state.firebaseReady) {
    loadLocalData();
    return;
  }

  onAuthStateChanged(auth, (user) => {
    state.user = user;
    state.isAdmin = isAllowedAdmin(user);
    updateAuthUI();
  });

  onSnapshot(query(collection(db, 'labs'), orderBy('createdAt', 'desc')), (snap) => {
    if (snap.empty) {
      state.labs = demoLabs.map(normalizeLab);
    } else {
      state.labs = snap.docs.map(d => normalizeLab({ id: d.id, ...d.data() }));
    }
    applyFilters();
    renderAdminList();
  });

  onSnapshot(doc(db, 'settings', 'site'), (snap) => {
    if (snap.exists()) state.settings = { ...state.settings, ...snap.data() };
    applySettingsToUI();
    applyFilters();
  });
}

function updateAuthUI() {
  const signedIn = !!state.user;
  $('loginBtn').classList.toggle('hidden', signedIn);
  $('logoutBtn').classList.toggle('hidden', !signedIn);
  $('adminGate').classList.toggle('hidden', state.isAdmin);
  $('adminDashboard').classList.toggle('hidden', !state.isAdmin);

  if (signedIn && !state.isAdmin) {
    $('adminGate').querySelector('.note').textContent = `Signed in as ${state.user.email}, but this Gmail is not in ADMIN_EMAILS.`;
  }

  if (state.isAdmin) {
    $('adminIdentity').textContent = `Signed in as ${state.user.email}`;
  }
}

async function login() {
  if (!state.firebaseReady) {
    toast('Firebase is not configured yet. Edit firebase-config.js first. Demo mode is active.');
    return;
  }
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

async function logout() {
  if (state.firebaseReady) await signOut(auth);
}

function getFilters() {
  return {
    search: $('searchInput').value.trim().toLowerCase(),
    subject: $('subjectFilter').value,
    classLevel: $('classFilter').value,
    category: $('examFilter').value
  };
}

function applyFilters() {
  const f = getFilters();
  state.filtered = state.labs.filter(lab => {
    const haystack = [lab.title, lab.subject, lab.classLevel, lab.category, lab.difficulty, lab.description, ...(lab.tags || [])].join(' ').toLowerCase();
    return (!f.search || haystack.includes(f.search)) &&
      (f.subject === 'all' || lab.subject === f.subject) &&
      (f.classLevel === 'all' || lab.classLevel === f.classLevel) &&
      (f.category === 'all' || lab.category === f.category);
  });

  state.pageSize = Number($('publicPageSize').value || state.settings.maxLabs || 9);
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
  renderLabs();
  renderPagination();
  updateStats();
}

function renderLabs() {
  const grid = $('labsGrid');
  grid.className = `labs-grid ${state.layout === 'list' ? 'list' : ''}`;
  grid.innerHTML = '';

  const start = (state.page - 1) * state.pageSize;
  const labs = state.filtered.slice(start, start + state.pageSize);

  if (!labs.length) {
    grid.innerHTML = `<div class="admin-card"><h3>No labs found</h3><p class="note">Try another search or filter.</p></div>`;
    return;
  }

  labs.forEach(lab => {
    const node = $('labCardTemplate').content.cloneNode(true);
    const card = node.querySelector('.lab-card');
    const image = node.querySelector('.lab-image');
    const meta = node.querySelector('.lab-meta');
    const title = node.querySelector('h3');
    const desc = node.querySelector('p');
    const tags = node.querySelector('.lab-tags');
    const link = node.querySelector('.open-lab');

    if (lab.imageUrl) image.style.backgroundImage = `linear-gradient(rgba(7,17,31,.08), rgba(7,17,31,.35)), url('${lab.imageUrl}')`;
    meta.innerHTML = `
      <span class="badge">${lab.subject}</span>
      <span class="badge">Class ${lab.classLevel}</span>
      <span class="badge">${lab.category}</span>
      ${lab.featured ? '<span class="badge featured">Featured</span>' : ''}
    `;
    title.textContent = lab.title;
    desc.textContent = lab.description;
    tags.innerHTML = (lab.tags || []).slice(0, 5).map(t => `<span class="tag">#${t}</span>`).join('');
    link.href = lab.labUrl;
    grid.appendChild(card);
  });
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  const pagination = $('pagination');
  pagination.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = '‹';
  prev.disabled = state.page === 1;
  prev.onclick = () => { state.page--; applyFilters(); };
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === state.page ? 'active' : '';
    btn.onclick = () => { state.page = i; applyFilters(); };
    pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = '›';
  next.disabled = state.page === totalPages;
  next.onclick = () => { state.page++; applyFilters(); };
  pagination.appendChild(next);
}

function updateStats() {
  $('statLabs').textContent = state.labs.length;
  $('resultCount').textContent = `Showing ${state.filtered.length} lab${state.filtered.length === 1 ? '' : 's'}`;
  $('adminTotalLabs').textContent = state.labs.length;
  $('featuredCount').textContent = state.labs.filter(l => l.featured).length;
}

function applySettingsToUI() {
  document.documentElement.style.setProperty('--columns', state.settings.columns || 3);
  $('gridColumns').value = state.settings.columns || 3;
  $('gridRows').value = state.settings.rows || 3;
  $('maxLabs').value = state.settings.maxLabs || 9;
  $('publicPageSize').value = String(state.settings.maxLabs || 9);
}

async function saveSettings() {
  const columns = Math.max(1, Math.min(4, Number($('gridColumns').value || 3)));
  const rows = Math.max(1, Math.min(8, Number($('gridRows').value || 3)));
  const maxLabs = Math.max(3, Math.min(48, Number($('maxLabs').value || columns * rows)));
  state.settings = { columns, rows, maxLabs };

  if (state.firebaseReady && state.isAdmin) {
    await setDoc(doc(db, 'settings', 'site'), state.settings, { merge: true });
  } else {
    saveLocalData();
  }
  applySettingsToUI();
  applyFilters();
}

function formToLab() {
  return normalizeLab({
    id: $('labId').value,
    title: $('title').value,
    subject: $('subject').value,
    classLevel: $('classLevel').value,
    category: $('category').value,
    difficulty: $('difficulty').value,
    imageUrl: $('imageUrl').value,
    labUrl: $('labUrl').value,
    description: $('description').value,
    tags: $('tags').value,
    featured: $('featured').checked,
    createdAt: serverTimestamp ? serverTimestamp() : new Date()
  });
}

async function saveLab(e) {
  e.preventDefault();
  if (state.firebaseReady && !state.isAdmin) {
    toast('Only admin Gmail can save labs. Add your email in firebase-config.js ADMIN_EMAILS and Firestore rules.');
    return;
  }

  const lab = formToLab();
  if (state.firebaseReady && state.isAdmin) {
    const { id, ...payload } = lab;
    if (id) await updateDoc(doc(db, 'labs', id), { ...payload, updatedAt: serverTimestamp() });
    else await addDoc(collection(db, 'labs'), { ...payload, createdAt: serverTimestamp() });
  } else {
    const index = state.labs.findIndex(l => l.id === lab.id);
    if (index >= 0) state.labs[index] = lab;
    else state.labs.unshift(lab);
    saveLocalData();
    applyFilters();
    renderAdminList();
  }
  resetForm();
}

function resetForm() {
  $('labForm').reset();
  $('labId').value = '';
  $('subject').value = 'Physics';
  $('classLevel').value = '1';
  $('category').value = 'NCERT';
  $('difficulty').value = 'Foundation';
}

function editLab(id) {
  const lab = state.labs.find(l => l.id === id);
  if (!lab) return;
  $('labId').value = lab.id;
  $('title').value = lab.title;
  $('subject').value = lab.subject;
  $('classLevel').value = lab.classLevel;
  $('category').value = lab.category;
  $('difficulty').value = lab.difficulty;
  $('imageUrl').value = lab.imageUrl;
  $('labUrl').value = lab.labUrl;
  $('description').value = lab.description;
  $('tags').value = (lab.tags || []).join(', ');
  $('featured').checked = lab.featured;
  location.hash = '#admin';
}

async function removeLab(id) {
  if (!confirm('Delete this lab?')) return;
  if (state.firebaseReady && state.isAdmin) {
    await deleteDoc(doc(db, 'labs', id));
  } else {
    state.labs = state.labs.filter(l => l.id !== id);
    saveLocalData();
    applyFilters();
    renderAdminList();
  }
}

function renderAdminList() {
  const list = $('adminList');
  list.innerHTML = '';
  state.labs.forEach(lab => {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div>
        <strong>${lab.title}</strong>
        <small>${lab.subject} • Class ${lab.classLevel} • ${lab.category} • ${lab.difficulty}</small>
      </div>
      <div class="admin-actions">
        <button data-edit="${lab.id}">Edit</button>
        <button data-delete="${lab.id}">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => editLab(btn.dataset.edit));
  list.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = () => removeLab(btn.dataset.delete));
  updateStats();
}

$('navToggle').onclick = () => $('navLinks').classList.toggle('open');
$('loginBtn').onclick = login;
$('adminLoginBtn').onclick = login;
$('logoutBtn').onclick = logout;
$('adminLogoutBtn').onclick = logout;
$('labForm').onsubmit = saveLab;
$('resetFormBtn').onclick = resetForm;
$('saveSettingsBtn').onclick = saveSettings;

['searchInput', 'subjectFilter', 'classFilter', 'examFilter', 'publicPageSize'].forEach(id => {
  $(id).addEventListener('input', () => { state.page = 1; applyFilters(); });
});

document.querySelectorAll('[data-layout]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('[data-layout]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.layout = btn.dataset.layout;
    renderLabs();
  };
});

connectFirebase();
updateAuthUI();
resetForm();
