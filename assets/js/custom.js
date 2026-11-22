import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let currentUser = null;
let clients = [];
let currentListId = null;

export async function initCustom(user) {
    currentUser = user;
    const urlParams = new URLSearchParams(window.location.search);
    currentListId = urlParams.get('list');

    const { data } = await supabase.from('clients').select('id, short_name');
    clients = sortClients(data || []);

    if (currentListId) {
        await renderListView();
    } else {
        await renderListViewList();
        setupListEvents();
    }
}

async function renderListViewList() {
    document.getElementById('customListsContainer').style.display = 'grid';
    document.querySelector('h1').textContent = 'Произвольные списки';
    document.getElementById('addListBtn').style.display = 'inline-flex';

    const { data: lists } = await supabase.from('custom_lists').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('customListsContainer');
    if (!lists || lists.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Нет списков</div>';
        return;
    }
    container.innerHTML = lists.map(l => `
        <div class="card">
            <div style="font-size: 16px; font-weight: 600;">${l.title}</div>
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 10px;">${l.date ? formatDate(l.date) : 'Без даты'}</div>
            <button class="btn btn-outline btn-sm view-list-btn" data-id="${l.id}">Открыть</button>
        </div>
    `).join('');
    document.querySelectorAll('.view-list-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            window.location.href = `custom.html?list=${e.target.dataset.id}`;
        });
    });
}

async function renderListView() {
    document.getElementById('customListsContainer').style.display = 'none';
    document.getElementById('addListBtn').style.display = 'none';

    const { data: list } = await supabase.from('custom_lists').select('*').eq('id', currentListId).single();
    if (!list) { window.location.href = 'custom.html'; return; }

    document.querySelector('h1').textContent = list.title;
    document.querySelector('.main-content').insertAdjacentHTML('beforeend', `
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <button class="btn btn-outline" onclick="window.location.href='custom.html'">Назад</button>
            <button class="btn btn-primary" id="editItemsBtn">Редактировать</button>
            <button class="btn btn-success" id="saveItemsBtn" style="display:none;">Сохранить</button>
        </div>
        <div class="card">
            <div id="listItemsContainer">Загрузка...</div>
        </div>
    `);

    await renderListItems(false);

    document.getElementById('editItemsBtn').addEventListener('click', async () => {
        await renderListItems(true);
        document.getElementById('editItemsBtn').style.display = 'none';
        document.getElementById('saveItemsBtn').style.display = 'inline-flex';
    });

    document.getElementById('saveItemsBtn').addEventListener('click', async () => {
        const rows = document.querySelectorAll('[data-item-id]');
        for (const row of rows) {
            const id = row.dataset.itemId;
            const note = row.querySelector('.note-input').value;
            const date = row.querySelector('.date-input').value || null;
            await supabase.from('custom_list_items').update({ note, date }).eq('id', id);
        }
        await renderListItems(false);
        document.getElementById('editItemsBtn').style.display = 'inline-flex';
        document.getElementById('saveItemsBtn').style.display = 'none';
    });
}

async function renderListItems(editing) {
    const { data: items } = await supabase.from('custom_list_items')
        .select('*, clients(short_name)')
        .eq('list_id', currentListId);
    const sorted = (items || []).sort((a, b) => {
        const an = (a.clients?.short_name || '').replace(/^(ООО|ИП)\s+/i, '').trim();
        const bn = (b.clients?.short_name || '').replace(/^(ООО|ИП)\s+/i, '').trim();
        return an.localeCompare(bn, 'ru');
    });

    const container = document.getElementById('listItemsContainer');
    if (sorted.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Нет организаций</div>';
        return;
    }

    container.innerHTML = sorted.map(i => `
        <div style="display: grid; grid-template-columns: 200px 1fr 150px; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;" data-item-id="${i.id}">
            <div style="font-weight: 600;">${i.clients?.short_name || '—'}</div>
            ${editing
                ? `<input type="text" class="note-input" value="${i.note || ''}" placeholder="Текст">`
                : `<div>${i.note || '—'}</div>`
            }
            ${editing
                ? `<input type="date" class="date-input" value="${i.date || ''}">`
                : `<div>${i.date ? formatDate(i.date) : '—'}</div>`
            }
        </div>
    `).join('');
}

function setupListEvents() {
    document.getElementById('clientCheckboxes').innerHTML = clients.map(c => `
        <label style="display: flex; align-items: center; gap: 8px; padding: 5px 0; font-weight: 400;">
            <input type="checkbox" value="${c.id}" class="client-cb"> ${c.short_name}
        </label>
    `).join('');

    document.getElementById('addListBtn').addEventListener('click', () => {
        document.getElementById('listModal').classList.add('active');
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        const cbs = document.querySelectorAll('.client-cb');
        const allChecked = Array.from(cbs).every(cb => cb.checked);
        cbs.forEach(cb => cb.checked = !allChecked);
    });

    document.getElementById('createListBtn').addEventListener('click', async () => {
        const title = document.getElementById('listTitle').value;
        const date = document.getElementById('listDate').value;
        if (!title) return alert('Введите название');
        const selected = Array.from(document.querySelectorAll('.client-cb:checked')).map(cb => cb.value);
        if (selected.length === 0) return alert('Выберите хотя бы одну организацию');

        const { data: newList, error } = await supabase.from('custom_lists').insert([{ title, date: date || null, created_by: currentUser.id }]).select().single();
        if (error) { alert('Ошибка создания'); return; }

        await supabase.from('custom_list_items').insert(selected.map(clientId => ({ list_id: newList.id, client_id: clientId })));

        document.getElementById('listModal').classList.remove('active');
        document.getElementById('listTitle').value = '';
        document.getElementById('listDate').value = '';
        document.querySelectorAll('.client-cb').forEach(cb => cb.checked = false);
        await renderListViewList();
    });
}
