import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

const container = document.getElementById('runs-container');

// --- ЛОГИКА РАСЧЕТА ДАТЫ (Пятница / Праздники) ---
function getAdjustedDate(year, month, day) {
  let date = new Date(year, month, day);
  const dayOfWeek = date.getDay();

  // Перенос на пятницу (если Сб или Вс)
  if (dayOfWeek === 6) date.setDate(date.getDate() - 1); // Сб -> Пт
  else if (dayOfWeek === 0) date.setDate(date.getDate() - 2); // Вс -> Пт

  // Специфика Нового года (если дата выпадает на 1-8 января, переносим на последний рабочий день декабря)
  // Для простоты, если попали на первые 8 дней января, переносим на 30 декабря предыдущего года
  if (date.getMonth() === 0 && date.getDate() <= 8) {
    date.setFullYear(date.getFullYear() - 1);
    date.setMonth(11); // Декабрь
    date.setDate(30);
    // Если 30 декабря - выходной, сдвигаем на 29
    if (date.getDay() === 6) date.setDate(29);
    if (date.getDay() === 0) date.setDate(28);
  }

  return date;
}

async function loadRuns() {
  const { data: runs, error } = await supabase
    .from('salary_runs')
    .select('*, salary_items(*, clients(short_name))')
    .order('pay_date', { ascending: false });

  if (error) { console.error(error); return; }

  if (runs.length === 0) {
    container.innerHTML = `<div class="text-center text-muted" style="padding: 40px;"><p>Ведомостей пока нет</p></div>`;
    return;
  }

  container.innerHTML = runs.map(run => {
    const isPaid = run.paid;
    const items = run.salary_items || [];
    // Сортировка клиентов в ведомости по алфавиту
    items.sort((a, b) => sortClients(a.clients, b.clients));

    const kindNames = { salary: 'Зарплата', advance: 'Аванс', vacation: 'Отпуск', sick: 'Больничный', dismissal: 'Увольнение' };

    let itemsHtml = items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.clients?.short_name || 'Ошибка'}</strong></td>
        <td>
          <select class="status-select ${item.status}" 
                  onchange="window.updateItemStatus('${item.id}', this.value, '${run.id}')"
                  ${isPaid ? 'disabled' : ''}>
            <option value="not_accrued" ${item.status === 'not_accrued' ? 'selected' : ''}>Не начислено</option>
            <option value="accrued" ${item.status === 'accrued' ? 'selected' : ''}>Начислено</option>
            <option value="paid" ${item.status === 'paid' ? 'selected' : ''}>Выплачено</option>
          </select>
        </td>
      </tr>
    `).join('');

    return `
      <div class="card mb-4" style="padding: 0; overflow: hidden;">
        <div class="action-card ${isPaid ? 'paid' : ''}" style="margin: 0; border-radius: 0; border-left: none; border-bottom: 1px solid var(--border-color);">
          <div>
            <div class="action-title">${kindNames[run.kind]} — ${formatDate(run.pay_date)}</div>
            <div class="action-date">Организаций: ${items.length}</div>
          </div>
          <div>
            ${isPaid 
              ? `<button class="btn btn-outline" onclick="window.toggleRunStatus('${run.id}', false)">Отменить</button>` 
              : `<button class="btn btn-success" onclick="window.toggleRunStatus('${run.id}', true)">Выполнено</button>`
            }
          </div>
        </div>
        
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>№</th><th>Организация</th><th>Статус</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

// --- СОЗДАНИЕ ВЕДОМОСТИ ---
document.getElementById('btn-add-run').addEventListener('click', () => {
  document.getElementById('run-modal').classList.add('active');
});

document.getElementById('btn-create-run').addEventListener('click', async () => {
  const kind = document.getElementById('run-kind').value;
  const dateInput = document.getElementById('run-date').value;

  if (!dateInput) { alert('Выберите дату!'); return; }

  const selectedDate = new Date(dateInput);
  const targetDay = selectedDate.getDate(); // Например, 5
  
  // Вычисляем фактическую дату с учетом выходных
  const actualDate = getAdjustedDate(selectedDate.getFullYear(), selectedDate.getMonth(), targetDay);
  const actualDateStr = actualDate.toISOString().split('T')[0];

  // Получаем клиентов, у которых нужный день ЗП или аванса
  const fieldToCheck = kind === 'salary' ? 'salary_day' : (kind === 'advance' ? 'advance_day' : null);
  
  let clientsQuery = supabase.from('clients').select('id, short_name');
  if (fieldToCheck) {
    clientsQuery = clientsQuery.eq(fieldToCheck, targetDay);
  } else {
    // Для отпуска/больничного/увольнения грузим всех (или можно сделать выбор вручную, 
    // но по ТЗ пока автоматически всех)
    clientsQuery = clientsQuery.limit(0); // Пока оставим пустым, если это не ЗП/Аванс, чтобы не ломать логику
  }

  const { data: clients } = await clientsQuery;
  
  if (!clients || clients.length === 0) {
    alert(`Нет организаций с датой ${kind === 'salary' ? 'зарплаты' : 'аванса'} ${targetDay} числа.`);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Создаем прогон (run)
  const { data: runData, error: runError } = await supabase.from('salary_runs').insert({
    kind: kind,
    pay_date: actualDateStr,
    created_by: user.id
  }).select().single();

  if (runError) { alert('Ошибка: ' + runError.message); return; }

  // 2. Создаем элементы (items)
  const itemsToInsert = clients.map(c => ({
    run_id: runData.id,
    client_id: c.id,
    status: 'not_accrued'
  }));

  const { error: itemsError } = await supabase.from('salary_items').insert(itemsToInsert);

  if (itemsError) {
    alert('Ошибка добавления организаций: ' + itemsError.message);
  } else {
    document.getElementById('run-modal').classList.remove('active');
    loadRuns();
  }
});

// --- ОБНОВЛЕНИЕ СТАТУСОВ ---
window.updateItemStatus = async (itemId, newStatus, runId) => {
  const { error } = await supabase.from('salary_items').update({ status: newStatus }).eq('id', itemId);
  if (error) { alert('Ошибка: ' + error.message); return; }
  
  // Обновляем класс у селекта для смены цвета
  const selectEl = document.querySelector(`select[onchange*="${itemId}"]`);
  if (selectEl) {
    selectEl.className = `status-select ${newStatus}`;
  }
};

// --- ЗАВЕРШЕНИЕ / ОТМЕНА ВЕДОМОСТИ ---
window.toggleRunStatus = async (runId, makePaid) => {
  const action = makePaid ? 'Завершить' : 'Отменить';
  if (!confirm(`Вы уверены, что хотите ${action.toLowerCase()} эту ведомость?`)) return;

  const { error } = await supabase.from('salary_runs').update({ paid: makePaid }).eq('id', runId);
  if (error) alert('Ошибка: ' + error.message);
  else loadRuns();
};

loadRuns();