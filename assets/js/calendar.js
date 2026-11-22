import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

let currentUser = null;
let currentDate = new Date();
let events = [];

const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export async function initCalendar(user) {
    currentUser = user;
    await loadEvents();
    renderCalendar();
    setupEvents();
}

async function loadEvents() {
    const { data: tasks } = await supabase.from('tasks').select('text, due_date').not('due_date', 'is', null);
    const { data: salaries } = await supabase.from('salary_runs').select('kind, pay_date').not('pay_date', 'is', null);
    const { data: reports } = await supabase.from('reports').select('title, due_date').not('due_date', 'is', null);
    const { data: payments } = await supabase.from('payments').select('title, pay_date').not('pay_date', 'is', null);
    const { data: notes } = await supabase.from('client_notes').select('text, event_date').not('event_date', 'is', null);

    events = [
        ...(tasks || []).map(t => ({ date: t.due_date, title: 'Задача: ' + t.text, type: 'task' })),
        ...(salaries || []).map(s => ({ date: s.pay_date, title: 'Выплата: ' + (s.kind === 'salary' ? 'Зарплата' : s.kind), type: 'salary' })),
        ...(reports || []).map(r => ({ date: r.due_date, title: 'Отчет: ' + r.title, type: 'report' })),
        ...(payments || []).map(p => ({ date: p.pay_date, title: 'Платеж: ' + p.title, type: 'payment' })),
        ...(notes || []).map(n => ({ date: n.event_date, title: 'Заметка: ' + n.text, type: 'note' }))
    ];
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    document.getElementById('currentMonth').textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay();

    const grid = document.getElementById('calendarGrid');
    let html = weekdays.map(d => `<div style="font-weight: 600; text-align: center; padding: 5px; font-size: 12px; color: var(--text-muted);">${d}</div>`).join('');

    for (let i = 1; i < startDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);
        const hasEvents = dayEvents.length > 0;
        html += `
            <div class="cal-day" data-date="${dateStr}" style="padding: 8px; border-radius: 8px; cursor: pointer; border: 1px solid var(--border); min-height: 50px; position: relative; background: ${hasEvents ? 'rgba(99,102,241,0.05)' : 'white'};">
                <div style="font-weight: 500;">${day}</div>
                ${hasEvents ? `<div style="width: 6px; height: 6px; border-radius: 50%; background: var(--primary); position: absolute; bottom: 5px; right: 5px;"></div>` : ''}
            </div>
        `;
    }
    grid.innerHTML = html;

    document.querySelectorAll('.cal-day').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            const dayEvents = events.filter(e => e.date === date);
            document.getElementById('selectedDateTitle').textContent = formatDate(date);
            const list = document.getElementById('eventsList');
            if (dayEvents.length === 0) {
                list.innerHTML = '<div style="color: var(--text-muted);">Событий нет</div>';
            } else {
                list.innerHTML = dayEvents.map(e => `<div style="padding: 8px 0; border-bottom: 1px solid var(--border);">${e.title}</div>`).join('');
            }
            document.getElementById('dayEvents').style.display = 'block';
        });
    });
}

function setupEvents() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}
