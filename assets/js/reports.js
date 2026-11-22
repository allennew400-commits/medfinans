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
            <div style="margin-top: 15px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-outline btn-sm view-report-btn" data-id="${r.id}">Открыть</button>
                ${!r.done
                    ? `<button class="btn btn-success btn-sm done-btn" data-id="${r.id}">Выполнено</button>`
                    : `<button class="btn btn-outline btn-sm undo-btn" data-id="${r.id}">Отменить</button>`
                }
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

    document.querySelectorAll('.undo-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Отменить статус сдачи?')) return;
            await supabase.from('reports').update({ done: false }).eq('id', e.target.dataset.id);
            loadReports();
        });
    });

    document.querySelectorAll('.view-report-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openReport(e.target.dataset.id));
    });
}

async function openReport(reportId) {
    const { data: items } = await supabase.from('report_items').select('*, clients(short_name)').eq('report_id', reportId);
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();

    const modal = document.getElementById('reportModal');
    const content = modal.querySelector('.modal-content');
    modal.querySelector('h3').textContent = `${report.title} — ${formatDate(report.due_date)}`;
    content.querySelectorAll('.form-group, #createReportBtn').forEach(el => el.style.display = 'none');

    let listHtml = '<div id="reportItemsList" style="margin-top: 15px;">';
    if (items && items.length > 0) {
        listHtml += items.map(i => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                <span>${i.clients?.short_name || '—'}</span>
                <select data-item="${i.id}" class="report-status">
                    <option value="not_submitted" ${i.status === 'not_submitted' ? 'selected' : ''}>Не сдано</option>
                    <option value="submitted" ${i.status === 'submitted' ? 'selected' : ''}>Сдано</option>
                    <option value="not_applicable" ${i.status === 'not_applicable' ? 'selected' : ''}>Не применяется</option>
                </select>
            </div>
        `).join('');
    } else {
        listHtml += '<div style="color: var(--text-muted);">Нет организаций</div>';
    }
    listHtml += '</div>';

    const existing = document.getElementById('reportItemsList');
    if (existing) existing.remove();
    content.insertAdjacentHTML('beforeend', listHtml);
    modal.classList.add('active');

    document.querySelectorAll('.report-status').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            await supabase.from('report_items').update({ status: e.target.value }).eq('id', e.target.dataset.item);
        });
    });
}

function setupEvents() {
    document.getElementById('addReportBtn').addEventListener('click', () => {
        const modal = document.getElementById('reportModal');
        const content = modal.querySelector('.modal-content');
        content.querySelectorAll('.form-group, #createReportBtn').forEach(el => el.style.display = 'block');
        content.querySelector('h3').textContent = 'Новый отчет';
        const list = document.getElementById('reportItemsList');
        if (list) list.remove();
        modal.classList.add('active');
    });

    document.getElementById('createReportBtn').addEventListener('click', async () => {
        const title = document.getElementById('reportTitle').value;
        const date = document.getElementById('reportDate').value;
        if (!title || !date) return alert('Заполните название и дату');

        const { data: newReport, error } = await supabase.from('reports')
            .insert([{ title, due_date: date, created_by: currentUser.id }]).select().single();
        if (error) { alert('Ошибка'); return; }

        const { data: clients } = await supabase.from('clients').select('id');
        if (clients && clients.length > 0) {
            await supabase.from('report_items').insert(clients.map(c => ({ report_id: newReport.id, client_id: c.id })));
        }

        document.getElementById('reportModal').classList.remove('active');
        loadReports();
    });
}
