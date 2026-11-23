import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let allClients = [];
let customLists = [];
let currentListId = null;
let currentItems = [];
let isEditMode = false;

const container = document.getElementById('custom-lists-container');

async function loadData() {
  const { data: cData } = await supabase.from('clients').select('id, short_name');
  allClients = (cData || []).sort(sortClients);

  const { data: lData } = await supabase.from('custom_lists').select('*').order('created_at', { ascending: false });
  customLists = lData || [];

  renderLists();
  populateCheckboxes();
}

function renderLists() {
  if (customLists.length === 0) {
    container.innerHTML = `<div class="card col-12 text-center text-muted" style="padding: 40px;">Списков пока нет</div>`;
    return;
  }

  container.innerHTML = customLists.map(list => `
    <div class="card col-4" style="cursor: pointer;" onclick="window.openCustomList('${list.id}')">
      <div class="card-header">
        <h3 class="card-title">${list.title}</h3>
        <i class="fa-solid fa-chevron-right text-muted"></i>
      </div>
      <p class="text-muted text-sm">${list.date ? `<i class="fa-regular fa-calendar"></i> ${formatDate(list.date)}` : 'Без даты'}</p>
    </div>
  `).join('');
}

function populateCheckboxes() {
  const listEl = document.getElementById('clients-checkbox-list');
  listEl.innerHTML = allClients.map(c => `
    <label class="checkbox-card">
      <input type="checkbox" value="${c.id}" class="client-checkbox">
      <span>${c.short_name}</span>
    </label>
  `).join('');
}

// --- СОЗДАНИЕ ---
document.getElementById('btn-add-custom').addEventListener('click', () => {
  document.getElementById('create-custom-modal').classList.add('active');
});

document.getElementById('select-all-clients').addEventListener('change', (e) => {
  document.querySelectorAll('.client-checkbox').forEach(cb => cb.checked = e.target.checked);
});

document.getElementById('btn-save-custom').addEventListener('click', async () => {
  const title = document.getElementById('custom-title').value.trim();
  const date = document.getElementById('custom-date').value || null;
  const selectedClients = Array.from(document.querySelectorAll('.client-checkbox:checked')).map(cb => cb.value);

  if (!title) { alert('Введите название!'); return; }
  if (selectedClients.length === 0) { alert('Выберите хотя бы одну организацию!'); return; }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Создаем список
  const { data: listData, error: listError } = await supabase.from('custom_lists').insert({
    title, date, created_by: user.id
  }).select().single();

  if (listError) { alert('Ошибка: ' + listError.message); return; }

  // 2. Добавляем элементы
  const items = selectedClients.map(cId => ({
    list_id: listData.id,
    client_id: cId
  }));

  const { error: itemsError } = await supabase.from('custom_list_items').insert(items);

  if (itemsError) {
    alert('Ошибка добавления: ' + itemsError.message);
  } else {
    document.getElementById('create-custom-modal').classList.remove('active');
    document.getElementById('custom-title').value = '';
    document.getElementById('custom-date').value = '';
    document.getElementById('select-all-clients').checked = false;
    loadData();
  }
});

// --- ПРОСМОТР И РЕДАКТИРОВАНИЕ ---
window.openCustomList = async (listId) => {
  currentListId = listId;
  const list = customLists.find(l => l.id === listId);
  document.getElementById('view-custom-title').textContent = list.title;
  
  await loadListItems();
  isEditMode = false;
  renderItems();
  
  document.getElementById('btn-edit-custom-items').style.display = 'inline-flex';
  document.getElementById('view-custom-footer').style.display = 'none';
  document.getElementById('view-custom-modal').classList.add('active');
};

async function loadListItems() {
  const { data } = await supabase.from('custom_list_items')
    .select('*, clients(short_name)')
    .eq('list_id', currentListId);
  
  currentItems = (data || []).sort((a, b) => sortClients(a.clients, b.clients));
}

function renderItems() {
  const tbody = document.getElementById('custom-items-tbody');
  
  if (currentItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Пусто</td></tr>`;
    return;
  }

  tbody.innerHTML = currentItems.map(item => `
    <tr data-item-id="${item.id}">
      <td><strong>${item.clients?.short_name}</strong></td>
      <td>${isEditMode ? `<input type="text" class="form-control item-note" value="${item.note || ''}" style="min-width: 200px;">` : (item.note || '—')}</td>
      <td>${isEditMode ? `<input type="date" class="form-control item-date" value="${item.date || ''}">` : (item.date ? formatDate(item.date) : '—')}</td>
    </tr>
  `).join('');
}

document.getElementById('btn-edit-custom-items').addEventListener('click', () => {
  isEditMode = true;
  renderItems();
  document.getElementById('btn-edit-custom-items').style.display = 'none';
  document.getElementById('view-custom-footer').style.display = 'flex';
});

document.getElementById('btn-cancel-edit-items').addEventListener('click', async () => {
  isEditMode = false;
  await loadListItems();
  renderItems();
  document.getElementById('btn-edit-custom-items').style.display = 'inline-flex';
  document.getElementById('view-custom-footer').style.display = 'none';
});

document.getElementById('btn-save-edit-items').addEventListener('click', async () => {
  const rows = document.querySelectorAll('#custom-items-tbody tr');
  const { data: { user } } = await supabase.auth.getUser();

  for (const row of rows) {
    const itemId = row.dataset.itemId;
    if (!itemId) continue;

    const note = row.querySelector('.item-note').value.trim();
    const date = row.querySelector('.item-date').value || null;

    await supabase.from('custom_list_items').update({
      note, date, updated_by: user.id, updated_at: new Date().toISOString()
    }).eq('id', itemId);
  }

  isEditMode = false;
  await loadListItems();
  renderItems();
  document.getElementById('btn-edit-custom-items').style.display = 'inline-flex';
  document.getElementById('view-custom-footer').style.display = 'none';
});

loadData();