import { supabase } from './supabase.js';
import { formatDate, sortClients } from './utils.js';

let currentUser = null;

const kindLabels = { salary: 'Зарплата', advance: 'Аванс', vacation: 'Отпуск', sick: 'Больничный', dismissal: 'Увольнение' };

export async function initSalary(user) {
    currentUser = user;
    loadSalaryRuns();
    setupEvents();
}

function adjustForWeekend(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    if (day === 6) d.setDate(d.getDate() - 1); // суббота -> пятница
    if (day === 0) d.setDate(d.getDate() - 2); // воскресенье -> пятница
    return d.toISOString().split('T')[0];
}

async function loadSalaryRuns() {
    const { data: runs } = await supabase.from('salary_runs').select('*').order('pay_date', { ascending: false });
    const container = document.getElementById('salaryRunsList');
    if (!runs || runs.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Нет созданных выплат</div>';
        return;
    }
    container.innerHTML = runs.map(r => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 16px; font-weight: 600;">${kindLabels[r.kind] || r.kind}</div>
                    <div style="font-size: 14px; color: var(--text-muted);">${formatDate(r.pay_date)}</div>
                </div>
                <span class="badge ${r.paid ? 'badge-success' : 'badge-pending'}">${r.paid ? 'Оплачено' : 'Ожидает'}</span>
            </div>
            <div style="margin-top: 15px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-outline btn-sm view-run-btn" data-id="${r.id}">Открыть</button>
                ${!r.paid
                    ? `<button class="btn btn-success btn-sm pay-btn" data-id="${r.id}">Выполнено</button>`
                    : `<button class="btn btn-outline btn-sm unpair-btn" data-id="${r.id}">Отменить</button>`
                }
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Вы уверены, что выплата произведена всем?')) return;
            await supabase.from('salary_runs').update({ paid: true }).eq('id', e.target.dataset.id);
            loadSalaryRuns();
        });
    });

    document.querySelectorAll('.unpair-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Отменить статус оплаты?')) return;
            await supabase.from('salary_runs').update({ paid: false }).eq('id', e.target.dataset.id);
            loadSalaryRuns();
        });
    });

    document.querySelectorAll('.view-run-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openRun(e.target.dataset.id));
    });
}

async function openRun(runId) {
    const { data: items } = await supabase.from('salary_items')
        .select('*, clients(short_name)')
        .eq('run_id', runId);
    const { data: run } = await supabase.from('salary_runs').select('*').eq('id', runId).single();

    const modal = document.getElementById('salaryModal');
    modal.querySelector('h3').textContent = `${kindLabels[run.kind]} — ${formatDate(run.pay_date)}`;
    const content = modal.querySelector('.modal-content');
    content.querySelectorAll('.form-group, #createSalaryBtn').forEach(el => el.style.display = 'none');

    let listHtml = '<div id="runItemsList" style="margin-top: 15px;">';
    if (items && items.length > 0) {
        listHtml += items.map(i => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                <span>${i.clients?.short_name || '—'}</span>
                <select data-item="${i.id}" class="item-status">
                    <option value="not_accrued" ${i.status === 'not_accrued' ? 'selected' : ''}>Не начислено</option>
                    <option value="accrued" ${i.status === 'accrued' ? 'selected' : ''}>Начислено</option>
                    <option value="paid" ${i.status === 'paid' ? 'selected' : ''}>Выплачено</option>
                </select>
            </div>
        `).join('');
    } else {
        listHtml += '<div style="color: var(--text-muted);">Нет организаций</div>';
    }
    listHtml += '</div>';

    let existing = document.getElementById('runItemsList');
    if (existing) existing.remove();
    content.insertAdjacentHTML('beforeend', listHtml);
    modal.classList.add('active');

    document.querySelectorAll('.item-status').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            await supabase.from('salary_items').update({ status: e.target.value }).eq('id', e.target.dataset.item);
        });
    });
}

function setupEvents() {
    document.getElementById('addSalaryBtn').addEventListener('click', () => {
        const modal = document.getElementById('salaryModal');
        const content = modal.querySelector('.modal-content');
        content.querySelectorAll('.form-group, #createSalaryBtn').forEach(el => el.style.display = 'block');
        content.querySelector('h3').textContent = 'Новая выплата';
        const list = document.getElementById('runItemsList');
        if (list) list.remove();
        modal.classList.add('active');
    });

    document.getElementById('createSalaryBtn').addEventListener('click', async () => {
        const kind = document.getElementById('salaryKind').value;
        const rawDate = document.getElementById('salaryDate').value;
        if (!rawDate) return alert('Выберите дату');

        const payDate = adjustForWeekend(rawDate);
        const day = new Date(payDate).getDate();

        // Определяем, какое поле у клиентов использовать
        const field = kind === 'advance' ? 'advance_day' : 'salary_day';

        const { data: clients } = await supabase.from('clients').select('id, short_name, salary_day, advance_day');
        const matched = (clients || []).filter(c => {
            const cd = kind === 'advance' ? c.advance_day : c.salary_day;
            if (!cd) return false;
            const adjusted = adjustForWeekend(`${new Date(payDate).getFullYear()}-${String(new Date(payDate).getMonth()+1).padStart(2,'0')}-${String(cd).padStart(2,'0')}`);
            return adjusted === payDate;
        });

        const { data: newRun, error } = await supabase.from('salary_runs')
            .insert([{ kind, pay_date: payDate, created_by: currentUser.id }]).select().single();
        if (error) { alert('Ошибка'); return; }

        if (matched.length > 0) {
            const items = matched.map(c => ({ run_id: newRun.id, client_id: c.id }));
            await supabase.from('salary_items').insert(items);
        }

        document.getElementById('salaryModal').classList.remove('active');
        loadSalaryRuns();
    });
}
