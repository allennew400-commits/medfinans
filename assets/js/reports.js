import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

const container = document.getElementById('reports-container');

async function loadReports() {
  const { data: reports, error } = await supabase
    .from('reports')
    .select('*, report_items(*, clients(short_name))')
    .order('due_date', { ascending: false });

  if (error) { console.error(error); return; }

  if (reports.length === 0) {
    container.innerHTML = `<div class="text-center text-muted" style="padding: 40px;"><p>Отчетов пока нет</p></div>`;
    return;
  }

  container.innerHTML = reports.map(rep => {
    const isDone = rep.done;
    const items = rep.report_items || [];
    items.sort((a, b) => sortClients(a.clients, b.clients));

    let itemsHtml = items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.clients?.short_name || 'Ошибка'}</strong></td>
        <td>
          <select class="status-select ${item.status}" 
                  onchange="window.updateReportItem('${item.id}', this.value)"
                  ${isDone ? 'disabled' : ''}>
            <option value="not_submitted" ${item.status === 'not_submitted' ? 'selected' : ''}>Не сдано</option>
            <option value="submitted" ${item.status === 'submitted' ? 'selected' : ''}>Сдано</option>
            <option value="not_applicable" ${item.status === 'not_applicable' ? 'selected' : ''}>Не применяется</option>
          </select>
        </td>
      </tr>
    `).join('');

    return `
      <div class="card mb-4" style="padding: 0; overflow: hidden;">
        <div class="action-card ${isDone ? 'paid' : ''}" style="margin: 0; border-radius: 0; border-left: none; border-bottom: 1px solid var(--border-color);">
          <div>
            <div class="action-title">${rep.title}</div>
            <div class="action-date">Срок: ${formatDate(rep.due_date)}</div>
          </div>
          <div>
            ${isDone 
              ? `<button class="btn btn-outline" onclick="window.toggleReportStatus('${rep.id}', false)">Отменить</button>` 
              : `<button class="btn btn-success" onclick="window.toggleReportStatus('${rep.id}', true)">Выполнено</button>`
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

// Создание отчета
document.getElementById('btn-add-report').addEventListener('click', () => {
  document.getElementById('report-modal').classList.add('active');
});

document.getElementById('btn-create-report').addEventListener('click', async () => {
  const title = document.getElementById('report-title').value.trim();
  const date = document.getElementById('report-date').value;

  if (!title || !date) { alert('Заполните все поля!'); return; }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Создаем отчет
  const { data: repData, error: repError } = await supabase.from('reports').insert({
    title,
    due_date: date,
    created_by: user.id
  }).select().single();

  if (repError) { alert('Ошибка: ' + repError.message); return; }

  // 2. Подтягиваем всех клиентов
  const { data: clients } = await supabase.from('clients').select('id');
  
  if (clients && clients.length > 0) {
    const items = clients.map(c => ({
      report_id: repData.id,
      client_id: c.id,
      status: 'not_submitted'
    }));
    await supabase.from('report_items').insert(items);
  }

  document.getElementById('report-modal').classList.remove('active');
  document.getElementById('report-title').value = '';
  loadReports();
});

// Обновление статуса
window.updateReportItem = async (itemId, status) => {
  const { error } = await supabase.from('report_items').update({ status }).eq('id', itemId);
  if (error) { alert('Ошибка: ' + error.message); return; }
  
  const selectEl = document.querySelector(`select[onchange*="${itemId}"]`);
  if (selectEl) selectEl.className = `status-select ${status}`;
};

// Завершение отчета
window.toggleReportStatus = async (repId, done) => {
  const action = done ? 'Завершить' : 'Отменить';
  if (!confirm(`Вы уверены, что хотите ${action.toLowerCase()} этот отчет?`)) return;

  const { error } = await supabase.from('reports').update({ done }).eq('id', repId);
  if (error) alert('Ошибка: ' + error.message);
  else loadReports();
};

loadReports();