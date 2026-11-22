import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

export async function loadDashboard(user) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Задачи на неделю
    const { data: tasks } = await supabase.from('tasks')
        .select('*')
        .eq('scope', 'common')
        .eq('completed', false)
        .gte('due_date', todayStr)
        .lte('due_date', nextWeekStr)
        .order('due_date');

    const taskContainer = document.getElementById('dash-tasks');
    if (tasks && tasks.length > 0) {
        taskContainer.innerHTML = tasks.map(t => 
            `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.text} <span style="color:var(--danger); font-size:12px;">${formatDate(t.due_date)}</span></div>`
        ).join('');
    } else {
        taskContainer.innerHTML = '<span style="color:var(--text-muted);">Нет задач на эту неделю</span>';
    }

    // Дни рождения
    const month = today.getMonth() + 1;
    const { data: birthdays } = await supabase.from('clients')
        .select('short_name, director_name, director_birthday')
        .not('director_birthday', 'is', null);

    const bdayContainer = document.getElementById('dash-birthdays');
    const currentBdays = birthdays?.filter(b => {
        const d = new Date(b.director_birthday);
        return d.getMonth() + 1 === month;
    });
    if (currentBdays && currentBdays.length > 0) {
        bdayContainer.innerHTML = currentBdays.map(b => 
            `<div style="padding: 8px 0;">${b.short_name} — ${b.director_name} (${formatDate(b.director_birthday)})</div>`
        ).join('');
    } else {
        bdayContainer.innerHTML = '<span style="color:var(--text-muted);">Нет дней рождения в этом месяце</span>';
    }

    // Зарплаты
    const { data: salaries } = await supabase.from('salary_runs')
        .select('*')
        .eq('paid', false)
        .gte('pay_date', todayStr)
        .lte('pay_date', nextWeekStr);

    const salContainer = document.getElementById('dash-salary');
    if (salaries && salaries.length > 0) {
        salContainer.innerHTML = salaries.map(s => 
            `<div style="padding: 8px 0;">${s.kind === 'salary' ? 'Зарплата' : s.kind} — ${formatDate(s.pay_date)}</div>`
        ).join('');
    } else {
        salContainer.innerHTML = '<span style="color:var(--text-muted);">Нет выплат на этой неделе</span>';
    }

    // Платежи
    const { data: payments } = await supabase.from('payments')
        .select('*')
        .eq('done', false)
        .gte('pay_date', todayStr)
        .lte('pay_date', nextWeekStr);

    const payContainer = document.getElementById('dash-payments');
    if (payments && payments.length > 0) {
        payContainer.innerHTML = payments.map(p => 
            `<div style="padding: 8px 0;">${p.title} — ${formatDate(p.pay_date)}</div>`
        ).join('');
    } else {
        payContainer.innerHTML = '<span style="color:var(--text-muted);">Нет платежей на этой неделе</span>';
    }
    // Заметки клиентов с датой события за 7 дней
    const { data: notes } = await supabase.from('client_notes')
        .select('text, event_date, clients(short_name)')
        .not('event_date', 'is', null)
        .gte('event_date', todayStr)
        .lte('event_date', nextWeekStr)
        .order('event_date');
    
    const notesContainer = document.getElementById('dash-notes');
    if (notes && notes.length > 0) {
        notesContainer.innerHTML = notes.map(n =>
            `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${n.clients?.short_name || ''}: ${n.text} <span style="color:var(--danger); font-size:12px;">${formatDate(n.event_date)}</span></div>`
        ).join('');
    } else {
        notesContainer.innerHTML = '<span style="color:var(--text-muted);">Нет заметок на эту неделю</span>';
    }
}
