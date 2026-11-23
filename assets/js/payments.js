import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let allClients = [];
let allPayments = [];
let currentClientId = null;

const container = document.getElementById('payments-container');
const modal = document.getElementById('client-payments-modal');
const paymentsList = document.getElementById('payments-list');
const addForm = document.getElementById('add-payment-form');

async function loadData() {
  // Загружаем клиентов
  const { data: cData } = await supabase.from('clients').select('id, short_name');
  allClients = (cData || []).sort(sortClients);

  // Загружаем все платежи
  const { data: pData } = await supabase.from('payments').select('*');
  allPayments = pData || [];

  renderClients();
}

function renderClients(filterText = '') {
  let filtered = allClients;
  if (filterText) {
    filtered = allClients.filter(c => c.short_name.toLowerCase().includes(filterText.toLowerCase()));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted">Ничего не найдено</p>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const clientPayments = allPayments.filter(p => p.client_id === c.id);
    const activeCount = clientPayments.filter(p => !p.done).length;
    
    return `
      <div class="client-card" onclick="window.openClientPayments('${c.id}', '${c.short_name.replace(/'/g, "\\'")}')">
        <div class="client-card-header">
          <div class="client-card-title">${c.short_name}</div>
          ${activeCount > 0 ? `<span class="badge badge-warning">${activeCount} активных</span>` : '<span class="badge badge-success">Все оплачено</span>'}
        </div>
        <div class="client-card-info"><i class="fa-solid fa-list"></i> Всего платежей: ${clientPayments.length}</div>
      </div>
    `;
  }).join('');
}

window.openClientPayments = (clientId, clientName) => {
  currentClientId = clientId;
  document.getElementById('modal-client-name').textContent = `Платежи: ${clientName}`;
  renderClientPayments();
  modal.classList.add('active');
};

function renderClientPayments() {
  const clientPayments = allPayments
    .filter(p => p.client_id === currentClientId)
    .sort((a, b) => new Date(a.pay_date) - new Date(b.pay_date));

  if (clientPayments.length === 0) {
    paymentsList.innerHTML = `<p class="text-muted text-center" style="padding: 20px;">У этой организации пока нет платежей.</p>`;
    return;
  }

  paymentsList.innerHTML = clientPayments.map(p => `
    <div class="action-card ${p.done ? 'paid' : ''}" style="padding: 16px; margin-bottom: 12px;">
      <div>
        <div class="action-title" style="font-size: 1rem;">${p.title}</div>
        <div class="action-date">Дата: ${formatDate(p.pay_date)}</div>
      </div>
      <div>
        ${p.done 
          ? `<button class="btn btn-sm btn-outline" onclick="window.togglePayment('${p.id}', false)">Отменить</button>`
          : `<button class="btn btn-sm btn-success" onclick="window.togglePayment('${p.id}', true)">Выполнено</button>`
        }
      </div>
    </div>
  `).join('');
}

window.togglePayment = async (paymentId, isDone) => {
  const action = isDone ? 'выполненным' : 'невыполненным';
  if (!confirm(`Отметить платеж ${action}?`)) return;

  const { error } = await supabase.from('payments').update({ done: isDone }).eq('id', paymentId);
  if (error) { alert('Ошибка: ' + error.message); return; }

  // Обновляем локальные данные
  const pIndex = allPayments.findIndex(p => p.id === paymentId);
  if (pIndex > -1) allPayments[pIndex].done = isDone;

  renderClientPayments();
  renderClients(document.getElementById('search-payment').value);
};

// Добавление
document.getElementById('btn-add-payment').addEventListener('click', () => {
  addForm.style.display = 'block';
  document.getElementById('new-payment-title').focus();
});

document.getElementById('btn-cancel-payment').addEventListener('click', () => {
  addForm.style.display = 'none';
  document.getElementById('new-payment-title').value = '';
  document.getElementById('new-payment-date').value = '';
});

document.getElementById('btn-save-payment').addEventListener('click', async () => {
  const title = document.getElementById('new-payment-title').value.trim();
  const date = document.getElementById('new-payment-date').value;

  if (!title || !date) { alert('Заполните все поля!'); return; }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('payments').insert({
    client_id: currentClientId,
    title,
    pay_date: date,
    created_by: user.id
  }).select().single();

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    allPayments.push(data);
    addForm.style.display = 'none';
    document.getElementById('new-payment-title').value = '';
    document.getElementById('new-payment-date').value = '';
    renderClientPayments();
    renderClients(document.getElementById('search-payment').value);
  }
});

document.getElementById('search-payment').addEventListener('input', (e) => {
  renderClients(e.target.value);
});

loadData();