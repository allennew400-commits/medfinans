import { supabase } from './supabase.js';
import { formatDate, copyToClipboard } from './utils.js';

let clientId = null;
let currentUser = null;
let isEditing = false;
let isCreating = false;

const fields = [
    { key: 'short_name', label: 'Сокращенное наименование', type: 'text', required: true },
    { key: 'full_name', label: 'Полное наименование', type: 'text' },
    { key: 'kind', label: 'Тип', type: 'select', options: ['ООО', 'ИП'] },
    { key: 'inn', label: 'ИНН', type: 'text' },
    { key: 'kpp', label: 'КПП', type: 'text' },
    { key: 'ogrn', label: 'ОГРН', type: 'text' },
    { key: 'director_role', label: 'Должность директора', type: 'select', options: ['Директор', 'Генеральный директор'] },
    { key: 'director_name', label: 'ФИО Директора', type: 'text' },
    { key: 'director_birthday', label: 'Дата рождения директора', type: 'date' },
    { key: 'director_phone', label: 'Телефон директора', type: 'text' },
    { key: 'email_1c', label: 'Почта 1С', type: 'text' },
    { key: 'email_work', label: 'Рабочая почта', type: 'text' },
    { key: 'registration_date', label: 'Дата регистрации', type: 'date' },
    { key: 'registration_authority', label: 'Регистрирующий орган', type: 'text' },
    { key: 'tax_type', label: 'Вид налогообложения', type: 'text' },
    { key: 'bank_bik', label: 'Банк (БИК)', type: 'text' },
    { key: 'account_number', label: 'Номер счета', type: 'text' },
    { key: 'legal_address', label: 'Юридический адрес', type: 'text' },
    { key: 'actual_address', label: 'Фактический адрес', type: 'text' },
    { key: 'tax_office', label: 'Налоговая инспекция', type: 'text' },
    { key: 'okopf', label: 'ОКОПФ', type: 'text' },
    { key: 'okfs', label: 'ОКФС', type: 'text' },
    { key: 'okved', label: 'ОКВЭД', type: 'text' },
    { key: 'edo_astral', label: 'ЭДО Калуга Астрал', type: 'text' },
    { key: 'edo_sbis', label: 'ЭДО СБИС', type: 'text' },
    { key: 'salary_day', label: 'Дата зарплаты (число)', type: 'select', options: [5,10,15,20,25,30] },
    { key: 'advance_day', label: 'Дата аванса (число)', type: 'select', options: [5,10,15,20,25,30] },
    { key: 'work_start_date', label: 'Дата начала работы с клиникой', type: 'date' }
];

export async function initClient(user) {
    currentUser = user;
    const urlParams = new URLSearchParams(window.location.search);
    clientId = urlParams.get('id');

    if (!clientId) {
        // Режим создания
        isCreating = true;
        document.getElementById('clientTitle').textContent = 'Новый клиент';
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('createBtn').style.display = 'inline-flex';
        document.getElementById('addNoteBtn').style.display = 'none';
        document.getElementById('notesList').style.display = 'none';
        renderFields({});
        setupCreateEvent();
    } else {
        await loadClient();
        await loadNotes();
        setupEvents();
    }
}

async function loadClient() {
    const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (error || !client) { alert('Клиент не найден'); return; }
    document.getElementById('clientTitle').textContent = client.short_name;
    renderFields(client);
}

function renderFields(client) {
    const card = document.getElementById('clientCard');
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';

    fields.forEach(f => {
        let val = client[f.key] || '';
        if (f.type === 'date' && val) val = formatDate(val);

        html += `<div>
            <label>${f.label}${f.required ? ' *' : ''}</label>
            <div style="display: flex; gap: 5px; align-items: center;">
                ${(isEditing || isCreating)
                    ? (f.type === 'select'
                        ? `<select data-key="${f.key}">${f.options.map(o => `<option value="${o}" ${String(val).includes(String(o)) ? 'selected' : ''}>${o}${f.key.includes('day')?' число':''}</option>`).join('')}</select>`
                        : `<input type="${f.type}" data-key="${f.key}" value="${client[f.key] || ''}">`)
                    : `<span id="val-${f.key}" style="font-weight: 500; word-break: break-all;">${val || '—'}</span>
                       ${val ? `<button class="copy-btn" data-copy="${val}">Копировать</button>` : ''}`
                }
            </div>
        </div>`;
    });

    // Файлы
    if (isCreating || isEditing) {
        html += `<div>
            <label>Реквизиты (файл)</label>
            <input type="file" id="fileRequisites">
            ${client.requisites_file_url ? `<div style="font-size:12px; margin-top:4px;"><a href="${client.requisites_file_url}" target="_blank">Текущий файл</a></div>` : ''}
        </div>`;
        html += `<div>
            <label>Лицензия (файл)</label>
            <input type="file" id="fileLicense">
            ${client.license_file_url ? `<div style="font-size:12px; margin-top:4px;"><a href="${client.license_file_url}" target="_blank">Текущий файл</a></div>` : ''}
        </div>`;
    } else {
        html += `<div><label>Реквизиты</label><div>${client.requisites_file_url ? `<a href="${client.requisites_file_url}" target="_blank">Скачать файл</a>` : '—'}</div></div>`;
        html += `<div><label>Лицензия</label><div>${client.license_file_url ? `<a href="${client.license_file_url}" target="_blank">Скачать файл</a>` : '—'}</div></div>`;
    }

    html += '</div>';
    card.innerHTML = html;

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.copy, e.target));
    });
}

function collectFormData() {
    const data = {};
    document.querySelectorAll('[data-key]').forEach(el => {
        data[el.dataset.key] = el.value || null;
    });
    return data;
}

async function uploadFile(file, clientIdForPath, fieldName) {
    if (!file) return null;
    const path = `${clientIdForPath}/${fieldName}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('files').upload(path, file, { upsert: true });
    if (error) { console.error(error); return null; }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(path);
    return urlData.publicUrl;
}

function setupCreateEvent() {
    document.getElementById('createBtn').addEventListener('click', async () => {
        const data = collectFormData();
        if (!data.short_name) return alert('Заполните сокращенное наименование');
        data.created_by = currentUser.id;

        const { data: newClient, error } = await supabase.from('clients').insert([data]).select().single();
        if (error) { alert('Ошибка создания: ' + error.message); return; }

        // Файлы
        const reqFile = document.getElementById('fileRequisites')?.files[0];
        const licFile = document.getElementById('fileLicense')?.files[0];
        const updates = {};
        if (reqFile) {
            const url = await uploadFile(reqFile, newClient.id, 'requisites');
            if (url) updates.requisites_file_url = url;
        }
        if (licFile) {
            const url = await uploadFile(licFile, newClient.id, 'license');
            if (url) updates.license_file_url = url;
        }
        if (Object.keys(updates).length > 0) {
            await supabase.from('clients').update(updates).eq('id', newClient.id);
        }

        window.location.href = `client.html?id=${newClient.id}`;
    });
}

function setupEvents() {
    document.getElementById('editBtn').addEventListener('click', () => {
        isEditing = true;
        loadClient();
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'inline-flex';
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const updates = collectFormData();
        const reqFile = document.getElementById('fileRequisites')?.files[0];
        const licFile = document.getElementById('fileLicense')?.files[0];
        if (reqFile) {
            const url = await uploadFile(reqFile, clientId, 'requisites');
            if (url) updates.requisites_file_url = url;
        }
        if (licFile) {
            const url = await uploadFile(licFile, clientId, 'license');
            if (url) updates.license_file_url = url;
        }

        const { error } = await supabase.from('clients').update(updates).eq('id', clientId);
        if (error) { alert('Ошибка сохранения: ' + error.message); return; }
        isEditing = false;
        document.getElementById('editBtn').style.display = 'inline-flex';
        document.getElementById('saveBtn').style.display = 'none';
        await loadClient();
    });

    document.getElementById('addNoteBtn').addEventListener('click', () => {
        document.getElementById('noteModal').classList.add('active');
    });

    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const text = document.getElementById('noteText').value;
        const date = document.getElementById('noteDate').value;
        if (!text) return alert('Введите текст заметки');
        await supabase.from('client_notes').insert([{
            client_id: clientId, text, event_date: date || null, created_by: currentUser.id
        }]);
        document.getElementById('noteText').value = '';
        document.getElementById('noteDate').value = '';
        document.getElementById('noteModal').classList.remove('active');
        await loadNotes();
    });
}

async function loadNotes() {
    const { data: notes } = await supabase.from('client_notes')
        .select('*, profiles(full_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    const container = document.getElementById('notesList');
    if (!notes || notes.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Пока нет заметок</div>';
        return;
    }

    container.innerHTML = notes.map(n => `
        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <div style="font-size: 14px;">${n.text}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                ${n.event_date ? `Событие: ${formatDate(n.event_date)} | ` : ''}
                Автор: ${n.profiles?.full_name || 'Неизвестно'} | ${formatDate(n.created_at)}
            </div>
        </div>
    `).join('');
}
