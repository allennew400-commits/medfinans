import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

let currentUser = null;

export async function initSalary(user) {
    currentUser = user;
    loadSalaryRuns();
    setupEvents();
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
                    <div style="font-size: 16px; font-weight: 600;">${r.kind === 'salary' ? 'Зарплата' : r.kind}</div>
                    <div style="font-size: 14px; color: var(--text-muted);">${formatDate(r.pay_date)}</div>
                </div>
                <span class="badge ${r.paid ? 'badge-success' : 'badge-pending'}">${r.paid ? 'Оплачено' : 'Ожидает'}</span>
            </div>
            <div style="margin-top: 15px; text-align: right;">
                ${!r.paid ? `<button class="btn btn-success btn-sm pay-btn" data-id="${r.id}">Выполнено</button>` : ''}
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
}

function setupEvents() {
    document.getElementById('addSalaryBtn').addEventListener('click', () => {
        document.getElementById('salaryModal').classList.add('active');
    });

    document.getElementById('createSalaryBtn').addEventListener('click', async () => {
        const kind = document.getElementById('salaryKind').value;
        const date = document.getElementById('salaryDate').value;
        if (!date) return alert('Выберите дату');
        await supabase.from('salary_runs').insert([{ kind, pay_date: date, created_by: currentUser.id }]);
        document.getElementById('salaryModal').classList.remove('active');
        loadSalaryRuns();
    });
}
