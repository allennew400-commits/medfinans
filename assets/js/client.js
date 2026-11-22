import { supabase } from './supabase.js';
import { formatDate, copyToClipboard } from './utils.js';
import { formatPhone, attachPhoneMask } from './phone.js';

let clientId = null;
let currentUser = null;
let isEditing = false;
let isCreating = false;

// Группировка полей для красивого вывода
const fieldGroups = [
    {
        title: 'Основные данные',
        fields: [
            { key: 'short_name', label: 'Сокращенное наименование', type: 'text', required: true },
            { key: 'full_name', label: 'Полное наименование', type: 'text' },
            { key: 'kind', label: 'Тип', type: 'select', options: ['ООО', 'ИП'] },
            { key: 'inn', label: 'ИНН', type: 'text' },
            { key: 'kpp', label: 'КПП', type: 'text' },
            { key: 'ogrn', label: 'ОГРН', type: 'text' },
        ]
    },
    {
        title: 'Руководство',
        fields: [
            { key: 'director_role', label: 'Должность', type: 'select', options: ['Директор', 'Генеральный директор'] },
            { key: 'director_name', label: 'ФИО Директора', type: 'text' },
            { key: 'director_birthday', label: 'Дата рождения', type: 'date' },
            { key: 'director_phone', label: 'Телефон', type: 'text' },
        ]
    },
    {
        title: 'Контакты и почта',
        fields: [
            { key: 'email_1c', label: 'Почта 1С', type: 'text' },
            { key: 'email_work', label: 'Рабочая почта', type: 'text' },
        ]
    },
    {
        title: 'Регистрация и налоги',
        fields: [
            { key: 'registration_date', label: 'Дата регистрации', type: 'date' },
            { key: 'registration_authority', label: 'Регистрирующий орган', type: 'text' },
            { key: 'registration_authority_number', label: 'Номер регистрирующего органа', type: 'text' },
            { key: 'tax_office', label: 'Налоговая инспекция', type: 'text' },
            { key: 'tax_type', label: 'Вид налогообложения', type: 'text' },
        ]
    },
    {
        title: 'Банковские реквизиты',
        fields: [
            { key: 'bank_bik', label: 'Банк (БИК)', type: 'text' },
            { key: 'account_number', label: 'Номер счета', type: 'text' },
        ]
    },
    {
        title: 'Адреса',
        fields: [
            { key: 'legal_address', label: 'Юридический адрес', type: 'text' },
            { key: 'actual_address', label: 'Фактический адрес', type: 'text' },
        ]
    },
    {
        title: 'Коды статистики',
        fields: [
            { key: 'okopf', label: 'ОКОПФ', type: 'text' },
            { key: 'okfs', label: 'ОКФС', type: 'text' },
            { key: 'okved', label: 'ОКВЭД', type: 'text' },
        ]
    },
    {
        title: 'ЭДО',
        fields: [
            { key: 'edo_astral', label: 'Калуга Астрал', type: 'text' },
            { key: 'edo_sbis', label: 'СБИС', type: 'text' },
        ]
    },
    {
        title: 'Условия работы',
        fields: [
            { key: 'salary_day', label: 'Дата зарплаты', type: 'select', options: [5, 10, 15, 20, 25, 30] },
            { key: 'advance_day', label: 'Дата аванса', type: 'select', options: [5, 10, 15, 20, 25, 30] },
            { key: 'work_start_date', label: 'Дата начала работы', type: 'date' },
        ]
    }
];

export async function initClient(user) {
    currentUser = user;
    const urlParams = new URLSearchParams(window.location.search);
    clientId = urlParams.get('id');

    if (!clientId) {
        isCreating = true;
        document.getElementById('clientTitle').textContent = 'Новый клиент';
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('createBtn').style.display = 'inline-flex';
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) addNoteBtn.style.display = 'none';
        const notesList = document.getElementById('notesList');
        if (notesList) notesList.style.display = 'none';
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
    let html = '<div class="client-groups">';

    fieldGroups.forEach(group => {
        html += `<div class="client-group">
            <h3>${group.title}</h3>
            <div class="fields-grid">`;

        group.fields.forEach(f => {
            let val = client[f.key] || '';
            if (f.type === 'date' && val) val = formatDate(val);
            if (f.key === 'director_phone' && val) val = formatPhone(val);

            html += `<div class="field-item">
                <label>${f.label}${f.required ? ' *' : ''}</label>`;

            if (isEditing || isCreating) {
                if (f.type === 'select') {
                    html += `<select data-key="${f.key}">${f.options.map(o => `<option value="${o}" ${String(val).includes(String(o)) ? 'selected' : ''}>${o}${f.key.includes('day') ? ' число' : ''}</option>`).join('')}</select>`;
                } else {
                    html += `<input type="${f.type}" data-key="${f.key}" value="${client[f.key] || ''}">`;
                }
            } else {
                html += `<div class="value-box">
                    <span>${val || '—'}</span>
                    ${val ? `<button class="copy-btn" data-copy="${val}">Копировать</button>` : ''}
                </div>`;
            }
            html += `</div>`;
        });
        html += `</div></div>`;
    });

    // Блок файлов
    html += `<div class="client-group">
        <h3>Документы</h3>
        <div class="fields-grid">
            <div class="field-item">
                <label>Реквизиты (файл)</label>
                ${(isEditing || isCreating) 
                    ? `<input type="file" id="fileRequisites">
                       ${client.requisites_file_url ? `<div style="font-size:12px; margin-top:6px;"><a href="${client.requisites_file_url}" target="_blank">Открыть текущий файл</a></div>` : ''}`
                    : `<div class="value-box"><span>${client.requisites_file_url ? '<a href="'+client.requisites_file_url+'" target="_blank">Открыть файл</a>' : 'Файл не загружен'}</span></div>`
                }
            </div>
            <div class="field-item">
                <label>Лицензия (файл)</label>
                ${(isEditing || isCreating) 
                    ? `<input type="file" id="fileLicense">
                       ${client.license_file_url ? `<div style="font-size:12px; margin-top:6px;"><a href="${client.license_file_url}" target="_blank">Открыть текущий файл</a></div>` : ''}`
                    : `<div class="value-box"><span>${client.license_file_url ? '<a href="'+client.license_file_url+'" target="_blank">Открыть файл</a>' : 'Файл не загружен'}</span></div>`
                }
            </div>
        </div>
    </div>`;

    html += '</div>';
    card.innerHTML = html;

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.copy, e.target));
    });

    const phoneInput = document.querySelector('[data-key="director_phone"]');
    if (phoneInput) {
        attachPhoneMask(phoneInput);
    }
}

function collectFormData() {
    const data = {};
    document.querySelectorAll('[data-key]').forEach(el => {
        let value = el.value || null;
        if (el.dataset.key === 'director_phone' && value) {
            value = formatPhone(value);
        }
        data[el.dataset.key] = value;
    });
    return data;
}

// ИСПРАВЛЕНИЕ: теперь файл загружается и возвращает ПУБЛИЧНУЮ ссылку
async function uploadFile(file, clientIdForPath, fieldName) {
    if (!file) return null;
    const path = `${clientIdForPath}/${fieldName}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('files').upload(path, file, { upsert: true });
    
    if (error) { 
        console.error('Ошибка загрузки файла:', error); 
        alert('Ошибка загрузки файла: ' + error.message);
        return null; 
    }
    
    // Получаем публичный URL. ВАЖНО: бакет должен быть публичным!
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
    if (!container) return;
    if (!notes || notes.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Пока нет заметок</div>';
        return;
    }

    container.innerHTML = notes.map(n => `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
            <div style="font-size: 14px; font-weight: 500;">${n.text}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                ${n.event_date ? `Событие: ${formatDate(n.event_date)} | ` : ''}
                Автор: ${n.profiles?.full_name || 'Неизвестно'} | ${formatDate(n.created_at)}
            </div>
        </div>
    `).join('');
}
