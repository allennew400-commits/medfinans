import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let currentUser = null;
let clients = [];

export async function initPayments(user) {
    currentUser = user;
    const { data } = await supabase.from('clients').select('id, short_name');
    clients = sortClients(data || []);
    document.getElementById('paymentClient').innerHTML =
        clients.map(c => `<option value="${c.id}">${c.short_name}</option>`).join('');
    await processRecurringPayments();
    loadPayments();
    setupEvents();
}

async function processRecurringPayments() {
    const today = new Date().toISOString().split('T')[0];
    const { data: done } = await supabase.from('payments').select('*').eq('done', true);
    if (!done || done.length === 0) return;

    for (const p of done) {
        const next = new Date(p.pay_date);
        next.setMonth(next.getMonth() + 1);
        const nextStr = next.toISOString().split('T')[0];
        if (nextStr <= today) {
            const { data: existing } = await supabase.from('payments')
                .select('id')
                .eq('client_id', p.client_id)
                .eq('title', p.title)
                .eq('pay_date', nextStr)
                .maybeSingle();
            if (!existing) {
                await supabase.from('payments').insert([{
                    client_id: p.client_id,
                    title: p.title,
                    pay_date: nextStr,
                    created_by: p.created_by
                }]);
            }
        }
    }
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
            <td>
                ${!p.done
                    ? `<button class="btn btn-success btn-sm done-pay-btn" data-id="${p.id}">Выполнено</button>`
                    : `<button class="btn btn-outline btn-sm undo-pay-btn" data-id="${p.id}">Отменить</button>`
                }
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.done-pay-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Подтвердить выполнение платежа?')) return;
            await supabase.from('payments').update({ done: true }).eq('id', e.target.dataset.id);
            loadPayments();
        });
    });

    document.querySelectorAll('.undo-pay-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Отменить выполнение?')) return;
            await supabase.from('payments').update({ done: false }).eq('id', e.target.dataset.id);
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
