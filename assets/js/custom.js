import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let currentUser = null;
let clients = [];

export async function initCustom(user) {
    currentUser = user;
    const { data } = await supabase.from('clients').select('id, short_name');
    clients = sortClients(data || []);
    document.getElementById('clientCheckboxes').innerHTML = clients.map(c => `
        <label style="display: flex; align-items: center; gap: 8px; padding: 5px 0; font-weight: 400;">
            <input type="checkbox" value="${c.id}" class="client-cb"> ${c.short_name}
        </label>
    `).join('');
    loadLists();
    setupEvents();
}

async function loadLists() {
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

function setupEvents() {
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

        const items = selected.map(clientId => ({ list_id: newList.id, client_id: clientId }));
        await supabase.from('custom_list_items').insert(items);

        document.getElementById('listModal').classList.remove('active');
        document.getElementById('listTitle').value = '';
        document.getElementById('listDate').value = '';
        document.querySelectorAll('.client-cb').forEach(cb => cb.checked = false);
        loadLists();
    });
}
