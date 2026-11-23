import { supabase } from './supabase.js';
import { sortClients } from './utils.js';

let allClients = [];
let currentKind = 'all';

export async function initClients() {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) { console.error(error); return; }
    allClients = sortClients(data);
    renderTable();
    setupEvents();
}

function renderTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const tbody = document.getElementById('clientsTableBody');

    let filtered = allClients.filter(c => {
        const matchesKind = currentKind === 'all' || c.kind === currentKind;
        const matchesSearch = c.short_name.toLowerCase().includes(search) ||
            (c.inn && c.inn.includes(search)) ||
            (c.legal_address && c.legal_address.toLowerCase().includes(search));
        return matchesKind && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Ничего не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><b>${c.short_name}</b></td>
            <td><span class="badge badge-info">${c.kind || '-'}</span></td>
            <td>${c.inn || '-'}</td>
            <td>${c.director_name || '-'}</td>
            <td><a href="client.html?id=${c.id}" class="btn btn-outline btn-sm">Открыть</a></td>
        </tr>
    `).join('');
}

function setupEvents() {
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentKind = e.target.dataset.kind;
            renderTable();
        });
    });
}
