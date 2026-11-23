import { supabase } from './supabase.js';
import { sortClients, copyToClipboard } from './utils.js';

let clients = [];
let passwords = [];
let currentCategory = '1c';
let isEditMode = false;

const tabs = document.querySelectorAll('#pass-tabs .tab-btn');
const thead = document.getElementById('pass-thead');
const tbody = document.getElementById('pass-tbody');

// Конфигурация колонок для каждой вкладки
const columnsConfig = {
  '1c': ['Организация', 'Логин', 'Пароль'],
  'banks': ['Организация', 'Банк', 'Логин', 'Пароль'],
  'cash': ['Организация', 'Логин', 'Пароль', 'Касса (платформа)'],
  'ecp': ['Организация', 'Пароль'],
  'pharma': ['Организация', 'Логин', 'Пароль'],
  'gpc': ['Организация', 'Логин', 'Пароль'],
  'sogaz': ['Организация', 'Логин', 'Пароль']
};

async function loadData() {
  const { data: cData } = await supabase.from('clients').select('id, short_name');
  clients = (cData || []).sort(sortClients);

  const { data: pData } = await supabase.from('passwords').select('*');
  passwords = pData || [];

  renderTable();
}

function renderTable() {
  const cols = columnsConfig[currentCategory];
  document.getElementById('current-category-title').textContent = `Пароли: ${tabs.find(t => t.dataset.cat === currentCategory).textContent}`;

  // Рендер заголовков
  thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

  // Рендер строк
  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" class="text-center text-muted">Нет клиентов</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(client => {
    // Ищем пароли для этого клиента в текущей категории
    const clientPasswords = passwords.filter(p => p.client_id === client.id && p.category === currentCategory);
    
    // Если это не банки, берем первую запись (или создаем пустую виртуальную)
    if (currentCategory !== 'banks') {
      const p = clientPasswords[0] || { id: null, login: '', password: '', cash_platform: '' };
      return renderRow(client, p, cols);
    } 
    // Для банков берем все записи
    else {
      if (clientPasswords.length === 0) {
        const p = { id: null, bank_name: '', login: '', password: '' };
        return renderRow(client, p, cols, true); // true = можно добавить еще банк
      }
      // Если банков несколько, рендерим несколько строк для одного клиента
      return clientPasswords.map(p => renderRow(client, p, cols, true)).join('');
    }
  }).join('');

  // Если режим редактирования, навешиваем обработчики
  if (isEditMode) {
    document.querySelectorAll('.pass-input').forEach(input => {
      input.addEventListener('change', (e) => {
        e.target.dataset.changed = 'true';
      });
    });
  }
}

function renderRow(client, p, cols, isBank = false) {
  let rowHtml = `<tr data-client-id="${client.id}" data-pass-id="${p.id || ''}">`;
  
  // Первая колонка - Организация (всегда текст)
  rowHtml += `<td><strong>${client.short_name}</strong></td>`;

  if (currentCategory === 'banks') {
    rowHtml += `<td>${isEditMode ? `<input type="text" class="form-control pass-input" data-field="bank_name" value="${p.bank_name || ''}">` : (p.bank_name || '—')}</td>`;
  }

  if (cols.includes('Логин')) {
    rowHtml += `<td>${isEditMode ? `<input type="text" class="form-control pass-input" data-field="login" value="${p.login || ''}">` : getCopyableText(p.login)}</td>`;
  }

  if (cols.includes('Пароль')) {
    rowHtml += `<td class="td-password">${isEditMode ? `<input type="text" class="form-control pass-input" data-field="password" value="${p.password || ''}">` : getCopyableText(p.password, true)}</td>`;
  }

  if (cols.includes('Касса (платформа)')) {
    rowHtml += `<td>${isEditMode ? `<input type="text" class="form-control pass-input" data-field="cash_platform" value="${p.cash_platform || ''}">` : getCopyableText(p.cash_platform)}</td>`;
  }

  // Кнопка добавления банка (только в режиме редактирования для категории banks)
  if (isBank && isEditMode) {
    // Кнопка вешается на первую строку клиента
    rowHtml += `<td style="width: 50px;"><button class="btn btn-sm btn-outline add-bank-btn" data-client-id="${client.id}" title="Добавить банк"><i class="fa-solid fa-plus"></i></button></td>`;
  } else if (isBank) {
    rowHtml += `<td></td>`; // Пустая ячейка для выравнивания
  }

  rowHtml += `</tr>`;
  return rowHtml;
}

function getCopyableText(text, isPassword = false) {
  if (!text) return '—';
  const displayText = isPassword && !isEditMode ? '••••••••' : text;
  // Для паролей при клике на копирование берем реальный текст
  const copyText = text.replace(/'/g, "\\'");
  return `
    <div class="d-flex align-center gap-2">
      <span>${displayText}</span>
      <button class="copy-btn" onclick="window.copyText('${copyText}', this)"><i class="fa-regular fa-copy"></i></button>
    </div>
  `;
}

// --- ОБРАБОТЧИКИ ---
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.cat;
    isEditMode = false;
    document.getElementById('btn-edit-pass').style.display = 'inline-flex';
    document.getElementById('btn-save-pass').style.display = 'none';
    document.getElementById('btn-cancel-pass').style.display = 'none';
    renderTable();
  });
});

document.getElementById('btn-edit-pass').addEventListener('click', () => {
  isEditMode = true;
  document.getElementById('btn-edit-pass').style.display = 'none';
  document.getElementById('btn-save-pass').style.display = 'inline-flex';
  document.getElementById('btn-cancel-pass').style.display = 'inline-flex';
  renderTable();
});

document.getElementById('btn-cancel-pass').addEventListener('click', () => {
  isEditMode = false;
  document.getElementById('btn-edit-pass').style.display = 'inline-flex';
  document.getElementById('btn-save-pass').style.display = 'none';
  document.getElementById('btn-cancel-pass').style.display = 'none';
  loadData(); // Сбрасываем изменения
});

// Сохранение
document.getElementById('btn-save-pass').addEventListener('click', async () => {
  const btn = document.getElementById('btn-save-pass');
  btn.disabled = true; btn.innerHTML = 'Сохранение...';

  const rows = document.querySelectorAll('#pass-tbody tr');
  
  for (const row of rows) {
    const clientId = row.dataset.clientId;
    const passId = row.dataset.passId;
    
    // Собираем данные из инпутов
    const inputs = row.querySelectorAll('.pass-input');
    if (inputs.length === 0) continue;

    const data = {
      client_id: clientId,
      category: currentCategory,
      updated_by: (await supabase.auth.getUser()).data.user.id,
      updated_at: new Date().toISOString()
    };

    inputs.forEach(input => {
      data[input.dataset.field] = input.value.trim();
    });

    // Если все поля пустые, пропускаем (кроме банков, где может быть только название)
    const isEmpty = Object.keys(data).every(k => ['client_id', 'category', 'updated_by', 'updated_at'].includes(k) || !data[k]);
    if (isEmpty && passId) {
       // Можно добавить логику удаления, если всё стерли, но пока пропустим
    }

    if (passId) {
      // Обновляем
      await supabase.from('passwords').update(data).eq('id', passId);
    } else {
      // Создаем (только если есть хоть какие-то данные, кроме ID)
      if (data.login || data.password || data.bank_name || data.cash_platform) {
        await supabase.from('passwords').insert(data);
      }
    }
  }

  isEditMode = false;
  document.getElementById('btn-edit-pass').style.display = 'inline-flex';
  document.getElementById('btn-save-pass').style.display = 'none';
  document.getElementById('btn-cancel-pass').style.display = 'none';
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Сохранить';
  loadData();
});

// Добавление банка (делегирование событий)
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-bank-btn');
  if (btn) {
    const clientId = btn.dataset.clientId;
    // Находим строку клиента и добавляем новую пустую строку
    const clientRows = Array.from(tbody.querySelectorAll(`tr[data-client-id="${clientId}"]`));
    const lastRow = clientRows[clientRows.length - 1];
    
    const newRowHtml = renderRow({ id: clientId, short_name: lastRow.querySelector('strong').textContent }, { id: null, bank_name: '', login: '', password: '' }, columnsConfig['banks'], true);
    lastRow.insertAdjacentHTML('afterend', newRowHtml);
    
    // Навешиваем обработчик на новые инпуты
    const newRow = lastRow.nextElementSibling;
    newRow.querySelectorAll('.pass-input').forEach(input => {
      input.addEventListener('change', (e) => { e.target.dataset.changed = 'true'; });
    });
    
    // Фокусируемся на первом поле
    newRow.querySelector('input[data-field="bank_name"]').focus();
  }
});

window.copyText = (text, btn) => copyToClipboard(text, btn);

loadData();