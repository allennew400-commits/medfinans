import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let currentUser = null;
let clients = [];

export async function initPayments(user) {
    currentUser = user;
    const { data } = await supabase.from('clients').select('id, short_name');
    clients = sortClients(data || []);
    const select = document.getElementById('paymentClient');
    select.innerHTML = clients.map(c => `<option value="${c.id}">${c.short_name}</option>`).join('');
    loadPayments();
    setupEvents();
}

async function loadPayments() {
    const { data: payments } = await supabase.from('payments').select('*, clients(short_name)').order('pay_date', { ascending: false });
    const tbody = document.getElementById('paymentsTableBody');
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Нет платежей</td></tr>';
        return;
    }
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.clients?.short_name || '-'}</td>
            <td>${p.title}</td>
            <td>${formatDate(p.pay_date)}</td>
            <td><span class="badge ${p.done ? 'badge-success' : 'badge-pending'}">${p.done ? 'Выполнено' : 'Ожидает'}</span></td>
            <td>${!p.done ? `<button class="btn btn-success btn-sm done-pay-btn" data-id="${p.id}">Выполнено</button>` : ''}</td>
        </tr>
    `).join('');
    document.querySelectorAll('.done-pay-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Подтвердить выполнение платежа?')) return;
            await supabase.from('payments').update({ done: true }).eq('id', e.target.dataset.id);
            loadPayments();
        });
    });
}

function setupEvents() {
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentModal').classList.add('active');
    });

    document.getElementById('createPaymentBtn').addEventListener('click', async () => {
        const clientId = document.getElementById('paymentClient').value;
        const title = document.getElementById('paymentTitle').value;
        const date = document.getElementById('paymentDate').value;
        if (!title || !date) return alert('Заполните название и дату');
        await supabase.from('payments').insert([{ client_id: clientId, title, pay_date: date, created_by: currentUser.id }]);
        document.getElementById('paymentModal').classList.remove('active');
        loadPayments();
    });
}
