import { supabase } from './supabase.js';
import { sortClients, copyToClipboard } from './utils.js';

let currentUser = null;
let currentCat = '1c';
let isEditing = false;
let allClients = [];

export async function initPasswords(user) {
    currentUser = user;
    const { data } = await supabase.from('clients').select('id, short_name');
    allClients = sortClients(data);
    loadPasswords();
    setupEvents();
}

async function loadPasswords() {
    const { data: passwords } = await supabase.from('passwords').select('*').eq('category', currentCat);

    const head = document.getElementById('passTableHead');
    const body = document.getElementById('passTableBody');

    let headers = ['Организация'];
    if (currentCat === 'banks') headers.push('Банк', 'Логин', 'Пароль');
    else if (currentCat === 'cash') headers.push('Логин', 'Пароль', 'Касса (место)');
    else if (currentCat === 'ecp') headers.push('Пароль');
    else headers.push('Логин', 'Пароль');

    head.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    if (allClients.length === 0) {
        body.innerHTML = '<tr><td colspan="5">Нет клиентов</td></tr>';
        return;
    }

    body.innerHTML = allClients.map(client => {
        const passRecord = passwords?.find(p => p.client_id === client.id) || {};
        let row = `<td><b>${client.short_name}</b></td>`;

        if (currentCat === 'banks') {
            row += `
                <td>${isEditing ? `<input type="text" data-cat="banks" data-client="${client.id}" data-field="bank_name" value="${passRecord.bank_name || ''}">` : (passRecord.bank_name || '—')}</td>
                <td>${isEditing ? `<input type="text" data-cat="banks" data-client="${client.id}" data-field="login" value="${passRecord.login || ''}">` : (passRecord.login || '—')} ${passRecord.login && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.login}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-cat="banks" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>
            `;
        } else if (currentCat === 'cash') {
            row += `
                <td>${isEditing ? `<input type="text" data-cat="cash" data-client="${client.id}" data-field="login" value="${passRecord.login || ''}">` : (passRecord.login || '—')} ${passRecord.login && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.login}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-cat="cash" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-cat="cash" data-client="${client.id}" data-field="cash_platform" value="${passRecord.cash_platform || ''}">` : (passRecord.cash_platform || '—')}</td>
            `;
        } else if (currentCat === 'ecp') {
            row += `<td>${isEditing ? `<input type="text" data-cat="ecp" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>`;
        } else {
            row += `
                <td>${isEditing ? `<input type="text" data-cat="${currentCat}" data-client="${client.id}" data-field="login" value="${passRecord.login || ''}">` : (passRecord.login || '—')} ${passRecord.login && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.login}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-cat="${currentCat}" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>
            `;
        }

        return `<tr>${row}</tr>`;
    }).join('');

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.copy, e.target));
    });
}

function setupEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCat = e.target.dataset.cat;
            isEditing = false;
            document.getElementById('editPassBtn').style.display = 'inline-flex';
            document.getElementById('savePassBtn').style.display = 'none';
            loadPasswords();
        });
    });

    document.getElementById('editPassBtn').addEventListener('click', () => {
        isEditing = true;
        loadPasswords();
        document.getElementById('editPassBtn').style.display = 'none';
        document.getElementById('savePassBtn').style.display = 'inline-flex';
    });

    document.getElementById('savePassBtn').addEventListener('click', async () => {
        const inputs = document.querySelectorAll('[data-client]');
        const updates = {};

        inputs.forEach(input => {
            const clientId = input.dataset.client;
            if (!updates[clientId]) updates[clientId] = { client_id: clientId, category: currentCat };
            updates[clientId][input.dataset.field] = input.value;
        });

        for (const id in updates) {
            const { data } = await supabase.from('passwords').select('id').eq('client_id', id).eq('category', currentCat).maybeSingle();
            if (data) {
                await supabase.from('passwords').update(updates[id]).eq('id', data.id);
            } else {
                await supabase.from('passwords').insert([updates[id]]);
            }
        }

        isEditing = false;
        document.getElementById('editPassBtn').style.display = 'inline-flex';
        document.getElementById('savePassBtn').style.display = 'none';
        loadPasswords();
    });
}
