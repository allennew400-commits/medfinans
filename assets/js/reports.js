import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

let currentUser = null;

export async function initReports(user) {
    currentUser = user;
    loadReports();
    setupEvents();
}

async function loadReports() {
    const { data: reports } = await supabase.from('reports').select('*').order('due_date', { ascending: false });
    const container = document.getElementById('reportsList');
    if (!reports || reports.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Нет созданных отчетов</div>';
        return;
    }
    container.innerHTML = reports.map(r => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 16px; font-weight: 600;">${r.title}</div>
                    <div style="font-size: 14px; color: var(--text-muted);">${formatDate(r.due_date)}</div>
                </div>
                <span class="badge ${r.done ? 'badge-success' : 'badge-pending'}">${r.done ? 'Сдано' : 'Не сдано'}</span>
            </div>
            <div style="margin-top: 15px; text-align: right;">
                ${!r.done ? `<button class="btn btn-success btn-sm done-btn" data-id="${r.id}">Выполнено</button>` : ''}
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.done-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Подтвердить сдачу отчета по всем организациям?')) return;
            await supabase.from('reports').update({ done: true }).eq('id', e.target.dataset.id);
            loadReports();
        });
    });
}

function setupEvents() {
    document.getElementById('addReportBtn').addEventListener('click', () => {
        document.getElementById('reportModal').classList.add('active');
    });

    document.getElementById('createReportBtn').addEventListener('click', async () => {
        const title = document.getElementById('reportTitle').value;
        const date = document.getElementById('reportDate').value;
        if (!title || !date) return alert('Заполните название и дату');
        await supabase.from('reports').insert([{ title, due_date: date, created_by: currentUser.id }]);
        document.getElementById('reportModal').classList.remove('active');
        loadReports();
    });
}
