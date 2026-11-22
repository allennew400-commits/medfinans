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
    if (currentCat === 'banks') headers.push('Банк', 'Логин', 'Пароль', '');
    else if (currentCat === 'cash') headers.push('Логин', 'Пароль', 'Касса (место)');
    else if (currentCat === 'ecp') headers.push('Пароль');
    else headers.push('Логин', 'Пароль');

    head.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    body.innerHTML = allClients.map(client => {
        const records = passwords?.filter(p => p.client_id === client.id) || [];

        if (currentCat === 'banks' && records.length > 0) {
            // Несколько банков
            return records.map((r, idx) => `
                <tr>
                    ${idx === 0 ? `<td rowspan="${records.length}"><b>${client.short_name}</b></td>` : ''}
                    <td>${isEditing ? `<input type="text" data-id="${r.id}" data-field="bank_name" value="${r.bank_name || ''}">` : (r.bank_name || '—')}</td>
                    <td>${isEditing ? `<input type="text" data-id="${r.id}" data-field="login" value="${r.login || ''}">` : (r.login || '—')} ${r.login && !isEditing ? `<button class="copy-btn" data-copy="${r.login}">Копировать</button>` : ''}</td>
                    <td>${isEditing ? `<input type="text" data-id="${r.id}" data-field="password" value="${r.password || ''}">` : (r.password || '—')} ${r.password && !isEditing ? `<button class="copy-btn" data-copy="${r.password}">Копировать</button>` : ''}</td>
                    <td>${isEditing ? `<button class="btn btn-danger btn-sm delete-bank" data-id="${r.id}">Удалить</button>` : ''}</td>
                </tr>
            `).join('') + (isEditing ? `<tr><td colspan="5"><button class="btn btn-outline btn-sm add-bank" data-client="${client.id}">Добавить банк</button></td></tr>` : '');
        }

        const passRecord = records[0] || {};
        let row = `<td><b>${client.short_name}</b></td>`;

        if (currentCat === 'banks') {
            row += `
                <td>${isEditing ? `<input type="text" data-client="${client.id}" data-field="bank_name" value="">` : '—'}</td>
                <td>${isEditing ? `<input type="text" data-client="${client.id}" data-field="login" value="">` : '—'}</td>
                <td>${isEditing ? `<input type="text" data-client="${client.id}" data-field="password" value="">` : '—'}</td>
                <td>${isEditing ? `<button class="btn btn-outline btn-sm add-bank" data-client="${client.id}">Добавить банк</button>` : ''}</td>
            `;
        } else if (currentCat === 'cash') {
            row += `
                <td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="login" value="${passRecord.login || ''}">` : (passRecord.login || '—')} ${passRecord.login && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.login}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="cash_platform" value="${passRecord.cash_platform || ''}">` : (passRecord.cash_platform || '—')}</td>
            `;
        } else if (currentCat === 'ecp') {
            row += `<td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>`;
        } else {
            row += `
                <td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="login" value="${passRecord.login || ''}">` : (passRecord.login || '—')} ${passRecord.login && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.login}">Копировать</button>` : ''}</td>
                <td>${isEditing ? `<input type="text" data-id="${passRecord.id || ''}" data-client="${client.id}" data-field="password" value="${passRecord.password || ''}">` : (passRecord.password || '—')} ${passRecord.password && !isEditing ? `<button class="copy-btn" data-copy="${passRecord.password}">Копировать</button>` : ''}</td>
            `;
        }

        return `<tr>${row}</tr>`;
    }).join('');

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.copy, e.target));
    });

    document.querySelectorAll('.add-bank').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clientId = e.target.dataset.client;
            e.target.closest('tr').insertAdjacentHTML('afterend', `
                <tr>
                    <td></td>
                    <td><input type="text" data-new-client="${clientId}" data-field="bank_name" placeholder="Банк"></td>
                    <td><input type="text" data-new-client="${clientId}" data-field="login" placeholder="Логин"></td>
                    <td><input type="text" data-new-client="${clientId}" data-field="password" placeholder="Пароль"></td>
                    <td><button class="btn btn-success btn-sm save-new-bank" data-client="${clientId}">Сохранить</button></td>
                </tr>
            `);
            e.target.disabled = true;
        });
    });

    document.querySelectorAll('.delete-bank').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Удалить банк?')) return;
            await supabase.from('passwords').delete().eq('id', e.target.dataset.id);
            loadPasswords();
        });
    });

    document.querySelectorAll('.save-new-bank').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const clientId = e.target.dataset.client;
            const row = e.target.closest('tr');
            const inputs = row.querySelectorAll('[data-new-client]');
            const record = { client_id: clientId, category: 'banks' };
            inputs.forEach(inp => record[inp.dataset.field] = inp.value);
            await supabase.from('passwords').insert([record]);
            loadPasswords();
        });
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
        const inputs = document.querySelectorAll('input[data-field]:not([data-new-client])');
        const updates = {};
        inputs.forEach(input => {
            const recordId = input.dataset.id;
            const clientId = input.dataset.client;
            const key = recordId || clientId;
            if (!updates[key]) updates[key] = { id: recordId, client_id: clientId, category: currentCat };
            updates[key][input.dataset.field] = input.value;
        });

        for (const key in updates) {
            const u = updates[key];
            if (u.id) {
                await supabase.from('passwords').update(u).eq('id', u.id);
            } else {
                const { client_id, category, ...rest } = u;
                const hasValue = Object.values(rest).some(v => v);
                if (hasValue) {
                    await supabase.from('passwords').insert([{ client_id, category, ...rest }]);
                }
            }
        }

        isEditing = false;
        document.getElementById('editPassBtn').style.display = 'inline-flex';
        document.getElementById('savePassBtn').style.display = 'none';
        loadPasswords();
    });
}
