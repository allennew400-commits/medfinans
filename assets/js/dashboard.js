import { supabase } from './supabase.js';
import { formatDate, formatDateTime } from './utils.js';

const container = document.getElementById('dashboard-container');

async function loadDashboard() {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  try {
    // 1. Загружаем Задачи (ближайшие 7 дней)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, profiles(full_name)')
      .eq('completed', false)
      .gte('due_date', todayStr)
      .lte('due_date', nextWeekStr)
      .order('due_date', { ascending: true });

    // 2. Загружаем Заметки клиентов (события на ближайшие 7 дней)
    const { data: notes } = await supabase
      .from('client_notes')
      .select('*, clients(short_name), profiles(full_name)')
      .gte('event_date', todayStr)
      .lte('event_date', nextWeekStr)
      .order('event_date', { ascending: true });

    // 3. Загружаем Зарплаты/Платежи (напоминания)
    const { data: salaries } = await supabase
      .from('salary_runs')
      .select('*')
      .eq('paid', false)
      .gte('pay_date', todayStr)
      .lte('pay_date', nextWeekStr)
      .order('pay_date', { ascending: true });

    const { data: payments } = await supabase
      .from('payments')
      .select('*, clients(short_name)')
      .eq('done', false)
      .gte('pay_date', todayStr)
      .lte('pay_date', nextWeekStr)
      .order('pay_date', { ascending: true });

    // 4. Загружаем Дни рождения директоров (ищем по месяцу и дню)
    // Для простоты запросим всех клиентов и отфильтруем в JS, 
    // так как SQL-запрос по месяцу/дню в Supabase сделать чуть сложнее.
    const { data: clients } = await supabase.from('clients').select('short_name, director_name, director_birthday');

    renderDashboard(tasks || [], notes || [], salaries || [], payments || [], clients || []);

  } catch (error) {
    console.error('Ошибка загрузки дашборда:', error);
    container.innerHTML = `<p class="text-danger">Ошибка загрузки данных.</p>`;
  }
}

function renderDashboard(tasks, notes, salaries, payments, clients) {
  container.innerHTML = ''; // Очищаем скелетон

  // --- Блок 1: Задачи (7 дней) ---
  let tasksHtml = tasks.map(t => `
    <div class="d-flex align-center gap-3 mb-2" style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
      <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></div>
      <div style="flex: 1;">
        <div style="font-weight: 500; font-size: 0.95rem;">${t.text}</div>
        <div class="text-muted text-xs">Срок: ${formatDate(t.due_date)} | Автор: ${t.profiles?.full_name || 'Система'}</div>
      </div>
    </div>
  `).join('') || '<p class="text-muted">Нет срочных задач на неделю.</p>';

  // --- Блок 2: Заметки ---
  let notesHtml = notes.map(n => `
    <div class="note-card">
      <div class="note-date">${formatDate(n.event_date)}</div>
      <div class="note-text">${n.text}</div>
      <div class="note-author">${n.clients?.short_name} • добавил(а) ${n.profiles?.full_name || ''}</div>
    </div>
  `).join('') || '<p class="text-muted">Нет событий по клиентам.</p>';

  // --- Блок 3: Платежи и ЗП ---
  let financeHtml = '';
  if (salaries.length > 0) {
    financeHtml += salaries.map(s => `
      <div class="d-flex justify-between align-center mb-2" style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
        <span><i class="fa-solid fa-money-bill-wave text-success"></i> ${s.kind === 'salary' ? 'Зарплата' : s.kind}</span>
        <span class="badge badge-warning">${formatDate(s.pay_date)}</span>
      </div>
    `).join('');
  }
  if (payments.length > 0) {
    financeHtml += payments.map(p => `
      <div class="d-flex justify-between align-center mb-2" style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
        <span><i class="fa-solid fa-file-invoice-dollar text-primary"></i> ${p.title} (${p.clients?.short_name})</span>
        <span class="badge badge-danger">${formatDate(p.pay_date)}</span>
      </div>
    `).join('');
  }
  if (!financeHtml) financeHtml = '<p class="text-muted">Нет платежей на неделю.</p>';

  // --- Блок 4: Дни рождения (ищем совпадения в ближайшие 7 дней) ---
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  let bdaysHtml = '';
  clients.forEach(c => {
    if (!c.director_birthday) return;
    const bday = new Date(c.director_birthday);
    // Сравниваем только месяц и день, подставляя текущий год
    const bdayThisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    
    // Если ДР уже прошел в этом году, берем следующий год (для декабря)
    if (bdayThisYear < today && bdayThisYear.getMonth() === 11) {
        bdayThisYear.setFullYear(today.getFullYear() + 1);
    }

    if (bdayThisYear >= today && bdayThisYear <= nextWeek) {
      bdaysHtml += `
        <div class="d-flex justify-between align-center mb-2" style="padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
          <span><i class="fa-solid fa-cake-candles text-warning"></i> ${c.director_name} (${c.short_name})</span>
          <span class="badge badge-info">${formatDate(bdayThisYear)}</span>
        </div>
      `;
    }
  });
  if (!bdaysHtml) bdaysHtml = '<p class="text-muted">Нет дней рождения на неделе.</p>';

  // --- Сборка HTML ---
  container.innerHTML = `
    <div class="card col-6">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-list-check text-primary"></i> Задачи на неделю</h3>
        <a href="tasks.html" class="btn btn-sm btn-outline">Все задачи</a>
      </div>
      ${tasksHtml}
    </div>

    <div class="card col-6">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-calendar-star text-warning"></i> События и Дни Рождения</h3>
      </div>
      ${bdaysHtml}
      <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border-color);">
      ${notesHtml}
    </div>

    <div class="card col-12 mt-4">
      <div class="card-header">
        <h3 class="card-title"><i class="fa-solid fa-wallet text-success"></i> Ближайшие платежи и ЗП</h3>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        ${financeHtml}
      </div>
    </div>
  `;
}

// Запуск
loadDashboard();