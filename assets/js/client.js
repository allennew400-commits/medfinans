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
  const field = (key, isDate = false, isPhone = false, isSelect = false, options = [], isTextarea = false) => {
    let value = clientData[key] || '';
    if (isDate && value) value = formatDate(value);
    
    if (isEditMode) {
      if (isSelect) {
        return `<select class="form-control" id="edit-${key}">
          ${options.map(opt => `<option value="${opt}" ${value == opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>`;
      }
      if (isTextarea) {
        return `<textarea class="form-control" id="edit-${key}" rows="2">${value}</textarea>`;
      }
      return `<input type="${isDate ? 'date' : 'text'}" class="form-control ${isPhone ? 'phone-input' : ''}" id="edit-${key}" value="${isDate && value ? value.split('.').reverse().join('-') : value}">`;
    }
    
    if (!value) return '<span class="text-muted">—</span>';
    return `
      <span>${value}</span>
      <button class="copy-btn" onclick="window.copyText('${String(value).replace(/'/g, "\\'")}', this)"><i class="fa-regular fa-copy"></i></button>
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

    <div class="info-block" style="grid-column: span 2;">
      <div class="info-block-title"><i class="fa-solid fa-paperclip"></i> Файлы и Заметки</div>
      <div class="d-flex gap-4 mb-4 flex-wrap">
        <a href="${clientData.requisites_file_url || '#'}" target="_blank" class="btn btn-outline ${!clientData.requisites_file_url ? 'disabled' : ''}"><i class="fa-solid fa-file-pdf"></i> Реквизиты</a>
        <a href="${clientData.license_file_url || '#'}" target="_blank" class="btn btn-outline ${!clientData.license_file_url ? 'disabled' : ''}"><i class="fa-solid fa-file-contract"></i> Лицензия</a>
        <button class="btn btn-primary" onclick="document.getElementById('note-modal').classList.add('active')"><i class="fa-solid fa-plus"></i> Добавить заметку</button>
      </div>
      <div class="notes-list" id="notes-list"></div>
    </div>
  `;

  if (isEditMode) {
    document.querySelectorAll('.phone-input').forEach(input => maskPhone(input));
    document.getElementById('client-title-header').innerHTML = `Редактирование: ${clientData.short_name || ''}`;
  } else {
    document.getElementById('client-title-header').innerHTML = `${clientData.short_name || 'Карточка клиента'}`;
  }

  renderNotes();
}

// --- РЕНДЕР ЗАМЕТОК ---
function renderNotes() {
  const notesList = document.getElementById('notes-list');
  if (!notesList) return;
  
  if (!notesData || notesData.length === 0) {
    notesList.innerHTML = '<p class="text-muted">Заметок пока нет.</p>';
    return;
  }

  notesList.innerHTML = notesData.map(n => `
    <div class="note-card">
      ${n.event_date ? `<div class="note-date"><i class="fa-regular fa-calendar"></i> Событие: ${formatDate(n.event_date)}</div>` : ''}
      <div class="note-text">${n.text || ''}</div>
      <div class="note-author">Добавлено: ${n.created_at ? formatDate(n.created_at) : ''}</div>
    </div>
  `).join('');
}

// --- ЗАГРУЗКА ДАННЫХ (С ЗАЩИТОЙ ОТ ОШИБОК) ---
async function loadData() {
  console.log("Запуск загрузки карточки. ID из URL:", clientId);

  if (!clientId) {
    container.innerHTML = `<div class="card col-12 text-danger" style="padding: 20px;"><h3>Ошибка</h3><p>ID клиента не передан в ссылке. Вернитесь в список клиентов и попробуйте снова.</p></div>`;
    return;
  }

  try {
    // 1. Загружаем клиента
    const { data: cData, error: cError } = await supabase.from('clients').select('*').eq('id', clientId).single();
    
    if (cError) {
      throw new Error(`Ошибка базы данных: ${cError.message} (Код: ${cError.code})`);
    }
    
    clientData = cData;
    console.log("Данные клиента успешно загружены:", clientData);

    // 2. Загружаем заметки
    const { data: nData, error: nError } = await supabase.from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    
    if (nError) {
      console.warn("Не удалось загрузить заметки:", nError.message);
      notesData = []; // Если заметки не загрузились, просто пустой список, карточка не падает
    } else {
      notesData = nData || [];
    }

    // 3. Отрисовываем
    renderClient();

  } catch (error) {
    console.error("Критическая ошибка загрузки карточки:", error);
    container.innerHTML = `
      <div class="card col-12" style="border-left: 4px solid var(--danger);">
        <h3 class="text-danger mb-2"><i class="fa-solid fa-triangle-exclamation"></i> Не удалось загрузить карточку</h3>
        <p class="text-main">${error.message}</p>
        <p class="text-muted text-sm mt-2">Проверьте консоль браузера (F12) для подробностей.</p>
        <a href="clients.html" class="btn btn-outline mt-4">Вернуться к списку</a>
      </div>
    `;
  }
}

// --- ОБРАБОТЧИКИ КНОПОК ---
const btnEdit = document.getElementById('btn-edit');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');

if (btnEdit) {
  btnEdit.addEventListener('click', () => {
    isEditMode = true;
    btnEdit.style.display = 'none';
    btnSave.style.display = 'inline-flex';
    btnCancel.style.display = 'inline-flex';
    renderClient();
  });
}

if (btnCancel) {
  btnCancel.addEventListener('click', () => {
    isEditMode = false;
    btnEdit.style.display = 'inline-flex';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';
    renderClient();
  });
}

if (btnSave) {
  btnSave.addEventListener('click', async () => {
    btnSave.disabled = true; btnSave.innerHTML = 'Сохранение...';

    const fields = ['kind', 'short_name', 'full_name', 'inn', 'kpp', 'ogrn', 'director_role', 'director_name', 'director_birthday', 'director_phone', 'email_1c', 'email_work', 'registration_date', 'registration_authority', 'tax_type', 'bank_bik', 'account_number', 'legal_address', 'actual_address', 'tax_office', 'okopf', 'okfs', 'okved', 'edo_astral', 'edo_sbis', 'salary_day', 'advance_day', 'work_start_date'];
    
    const updates = {};
    fields.forEach(f => {
      const el = document.getElementById('edit-' + f);
      if (el) updates[f] = el.value || null;
    });

    const { error } = await supabase.from('clients').update(updates).eq('id', clientId);
    
    if (error) {
      alert('Ошибка сохранения: ' + error.message);
    } else {
      clientData = { ...clientData, ...updates };
      isEditMode = false;
      btnEdit.style.display = 'inline-flex';
      btnSave.style.display = 'none';
      btnCancel.style.display = 'none';
      renderClient();
    }
    btnSave.disabled = false; btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Сохранить';
  });
}

const btnSaveNote = document.getElementById('btn-save-note');
if (btnSaveNote) {
  btnSaveNote.addEventListener('click', async () => {
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
      loadData(); 
    }
  });
}

window.copyText = (text, btn) => copyToClipboard(text, btn);

// Запуск
loadData();
