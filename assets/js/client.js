import { supabase } from './supabase.js';
import { formatDate, copyToClipboard, maskPhone } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get('id');
let clientData = {};
let isEditMode = false;
let notesData = [];

const container = document.getElementById('client-data-container');

// --- РЕНДЕР КАРТОЧКИ ---
function renderClient() {
  // Универсальная функция для поля
  const field = (key, isDate = false, isPhone = false, isSelect = false, options = [], isTextarea = false) => {
    let value = clientData[key] || '';
    if (isDate && value) value = formatDate(value);
    
    if (isEditMode) {
      if (isSelect) {
        return `<select class="form-control" id="edit-${key}">
          ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>`;
      }
      if (isTextarea) {
        return `<textarea class="form-control" id="edit-${key}" rows="2">${value}</textarea>`;
      }
      return `<input type="${isDate ? 'date' : 'text'}" class="form-control ${isPhone ? 'phone-input' : ''}" id="edit-${key}" value="${isDate ? value.split('.').reverse().join('-') : value}">`;
    }
    
    if (!value) return '<span class="text-muted">—</span>';
    return `
      <span>${value}</span>
      <button class="copy-btn" onclick="window.copyText('${value.replace(/'/g, "\\'")}', this)"><i class="fa-regular fa-copy"></i></button>
    `;
  };

  container.innerHTML = `
    <div class="info-block">
      <div class="info-block-title"><i class="fa-solid fa-building"></i> Общая информация</div>
      <div class="info-row"><span class="info-label">Тип</span><span class="info-value">${field('kind', false, false, true, ['ООО', 'ИП'])}</span></div>
      <div class="info-row"><span class="info-label">Краткое наименование</span><span class="info-value">${field('short_name')}</span></div>
      <div class="info-row"><span class="info-label">Полное наименование</span><span class="info-value">${field('full_name', false, false, false, [], true)}</span></div>
      <div class="info-row"><span class="info-label">ИНН</span><span class="info-value">${field('inn')}</span></div>
      <div class="info-row"><span class="info-label">КПП</span><span class="info-value">${field('kpp')}</span></div>
      <div class="info-row"><span class="info-label">ОГРН</span><span class="info-value">${field('ogrn')}</span></div>
      <div class="info-row"><span class="info-label">Дата регистрации</span><span class="info-value">${field('registration_date', true)}</span></div>
      <div class="info-row"><span class="info-label">Регистрирующий орган</span><span class="info-value">${field('registration_authority')}</span></div>
      <div class="info-row"><span class="info-label">Налогообложение</span><span class="info-value">${field('tax_type')}</span></div>
      <div class="info-row"><span class="info-label">Начало работы</span><span class="info-value">${field('work_start_date', true)}</span></div>
    </div>

    <div class="info-block">
      <div class="info-block-title"><i class="fa-solid fa-user-tie"></i> Руководитель</div>
      <div class="info-row"><span class="info-label">Роль</span><span class="info-value">${field('director_role', false, false, true, ['Директор', 'Генеральный директор'])}</span></div>
      <div class="info-row"><span class="info-label">ФИО</span><span class="info-value">${field('director_name')}</span></div>
      <div class="info-row"><span class="info-label">Дата рождения</span><span class="info-value">${field('director_birthday', true)}</span></div>
      <div class="info-row"><span class="info-label">Телефон</span><span class="info-value">${field('director_phone', false, true)}</span></div>
      <div class="info-row"><span class="info-label">Рабочая почта</span><span class="info-value">${field('email_work')}</span></div>
      <div class="info-row"><span class="info-label">Почта 1С</span><span class="info-value">${field('email_1c')}</span></div>
    </div>

    <div class="info-block">
      <div class="info-block-title"><i class="fa-solid fa-building-columns"></i> Банк и адреса</div>
      <div class="info-row"><span class="info-label">БИК</span><span class="info-value">${field('bank_bik')}</span></div>
      <div class="info-row"><span class="info-label">Расчетный счет</span><span class="info-value">${field('account_number')}</span></div>
      <div class="info-row"><span class="info-label">Юр. адрес</span><span class="info-value">${field('legal_address', false, false, false, [], true)}</span></div>
      <div class="info-row"><span class="info-label">Факт. адрес</span><span class="info-value">${field('actual_address', false, false, false, [], true)}</span></div>
      <div class="info-row"><span class="info-label">Налоговая инспекция</span><span class="info-value">${field('tax_office')}</span></div>
    </div>

    <div class="info-block">
      <div class="info-block-title"><i class="fa-solid fa-file-shield"></i> Коды, ЭДО и ЗП</div>
      <div class="info-row"><span class="info-label">ОКОПФ</span><span class="info-value">${field('okopf')}</span></div>
      <div class="info-row"><span class="info-label">ОКФС</span><span class="info-value">${field('okfs')}</span></div>
      <div class="info-row"><span class="info-label">ОКВЭД</span><span class="info-value">${field('okved')}</span></div>
      <div class="info-row"><span class="info-label">Калуга Астрал</span><span class="info-value">${field('edo_astral')}</span></div>
      <div class="info-row"><span class="info-label">СБИС</span><span class="info-value">${field('edo_sbis')}</span></div>
      <div class="info-row"><span class="info-label">Дата зарплаты</span><span class="info-value">${field('salary_day', false, false, true, ['5','10','15','20','25','30'])}</span></div>
      <div class="info-row"><span class="info-label">Дата аванса</span><span class="info-value">${field('advance_day', false, false, true, ['5','10','15','20','25','30'])}</span></div>
    </div>

    <!-- Блок файлов и заметок -->
    <div class="info-block" style="grid-column: span 2;">
      <div class="info-block-title"><i class="fa-solid fa-paperclip"></i> Файлы и Заметки</div>
      <div class="d-flex gap-4 mb-4 flex-wrap">
        <a href="${clientData.requisites_file_url || '#'}" target="_blank" class="btn btn-outline ${!clientData.requisites_file_url ? 'disabled' : ''}"><i class="fa-solid fa-file-pdf"></i> Реквизиты</a>
        <a href="${clientData.license_file_url || '#'}" target="_blank" class="btn btn-outline ${!clientData.license_file_url ? 'disabled' : ''}"><i class="fa-solid fa-file-contract"></i> Лицензия</a>
        <button class="btn btn-primary" onclick="document.getElementById('note-modal').classList.add('active')"><i class="fa-solid fa-plus"></i> Добавить заметку</button>
      </div>
      
      <div class="notes-list" id="notes-list">
        <!-- Заметки рендерятся ниже -->
      </div>
    </div>
  `;

  if (isEditMode) {
    document.querySelectorAll('.phone-input').forEach(input => maskPhone(input));
    document.getElementById('client-title-header').innerHTML = `Редактирование: ${clientData.short_name}`;
  } else {
    document.getElementById('client-title-header').innerHTML = `${clientData.short_name || 'Карточка клиента'}`;
  }

  renderNotes();
}

// --- РЕНДЕР ЗАМЕТОК ---
function renderNotes() {
  const notesList = document.getElementById('notes-list');
  if (!notesData || notesData.length === 0) {
    notesList.innerHTML = '<p class="text-muted">Заметок пока нет.</p>';
    return;
  }

  notesList.innerHTML = notesData.map(n => `
    <div class="note-card">
      ${n.event_date ? `<div class="note-date"><i class="fa-regular fa-calendar"></i> Событие: ${formatDate(n.event_date)}</div>` : ''}
      <div class="note-text">${n.text}</div>
      <div class="note-author">Добавлено: ${n.created_at ? formatDate(n.created_at) : ''}</div>
    </div>
  `).join('');
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadData() {
  if (!clientId) return;
  
  // Клиент
  const { data: cData, error: cError } = await supabase.from('clients').select('*').eq('id', clientId).single();
  if (cError) { alert('Ошибка загрузки клиента'); return; }
  clientData = cData;

  // Заметки
  const { data: nData } = await supabase.from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
  notesData = nData || [];

  renderClient();
}

// --- ОБРАБОТЧИКИ КНОПОК ---
document.getElementById('btn-edit').addEventListener('click', () => {
  isEditMode = true;
  document.getElementById('btn-edit').style.display = 'none';
  document.getElementById('btn-save').style.display = 'inline-flex';
  document.getElementById('btn-cancel').style.display = 'inline-flex';
  renderClient();
});

document.getElementById('btn-cancel').addEventListener('click', () => {
  isEditMode = false;
  document.getElementById('btn-edit').style.display = 'inline-flex';
  document.getElementById('btn-save').style.display = 'none';
  document.getElementById('btn-cancel').style.display = 'none';
  renderClient();
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.innerHTML = 'Сохранение...';

  const fields = ['kind', 'short_name', 'full_name', 'inn', 'kpp', 'ogrn', 'director_role', 'director_name', 'director_birthday', 'director_phone', 'email_1c', 'email_work', 'registration_date', 'registration_authority', 'tax_type', 'bank_bik', 'account_number', 'legal_address', 'actual_address', 'tax_office', 'okopf', 'okfs', 'okved', 'edo_astral', 'edo_sbis', 'salary_day', 'advance_day', 'work_start_date'];
  
  const updates = {};
  fields.forEach(f => {
    const el = document.getElementById('edit-' + f);
    if (el) updates[f] = el.value || null;
  });

  const { error } = await supabase.from('clients').update(updates).eq('id', clientId);
  
  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    clientData = { ...clientData, ...updates };
    isEditMode = false;
    document.getElementById('btn-edit').style.display = 'inline-flex';
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('btn-cancel').style.display = 'none';
    renderClient();
  }
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Сохранить';
});

// Сохранение заметки
document.getElementById('btn-save-note').addEventListener('click', async () => {
  const text = document.getElementById('note-text').value.trim();
  const date = document.getElementById('note-date').value || null;

  if (!text) { alert('Введите текст заметки!'); return; }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('client_notes').insert({
    client_id: clientId,
    text: text,
    event_date: date,
    created_by: user.id
  });

  if (error) {
    alert('Ошибка сохранения заметки: ' + error.message);
  } else {
    document.getElementById('note-text').value = '';
    document.getElementById('note-date').value = '';
    document.getElementById('note-modal').classList.remove('active');
    loadData(); // Перезагружаем
  }
});

window.copyText = (text, btn) => copyToClipboard(text, btn);

// Запуск
loadData();