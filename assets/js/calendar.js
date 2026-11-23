import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

let currentDate = new Date();
let allEvents = [];

// Базовый список праздников РФ (можно расширять)
const HOLIDAYS = [
  '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', // Новый год
  '02-23', // 23 февраля
  '03-08', // 8 марта
  '05-01', // 1 мая
  '05-09', // 9 мая
  '06-12', // 12 июня
  '11-04'  // 4 ноября
];

async function loadEvents() {
  allEvents = [];
  
  // Задачи
  const { data: tasks } = await supabase.from('tasks').select('text, due_date').eq('completed', false);
  tasks?.forEach(t => t.due_date && allEvents.push({ date: t.due_date, title: t.text, type: 'task' }));

  // Зарплаты
  const { data: salaries } = await supabase.from('salary_runs').select('kind, pay_date').eq('paid', false);
  salaries?.forEach(s => allEvents.push({ date: s.pay_date, title: s.kind === 'salary' ? 'Зарплата' : s.kind, type: 'salary' }));

  // Отчеты
  const { data: reports } = await supabase.from('reports').select('title, due_date').eq('done', false);
  reports?.forEach(r => allEvents.push({ date: r.due_date, title: r.title, type: 'report' }));

  // Дни рождения директоров
  const { data: clients } = await supabase.from('clients').select('short_name, director_name, director_birthday');
  clients?.forEach(c => {
    if (c.director_birthday) {
      const bday = new Date(c.director_birthday);
      // Формируем дату на текущий год для отображения в календаре
      const mm = String(bday.getMonth() + 1).padStart(2, '0');
      const dd = String(bday.getDate()).padStart(2, '0');
      allEvents.push({ 
        date: `${currentDate.getFullYear()}-${mm}-${dd}`, 
        title: `ДР: ${c.director_name} (${c.short_name})`, 
        type: 'birthday' 
      });
    }
  });

  renderCalendar();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Заголовок
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // День недели первого дня (0 - Вс, 1 - Пн...)
  let firstDayIndex = firstDay.getDay();
  if (firstDayIndex === 0) firstDayIndex = 7; // Делаем Пн = 1, Вс = 7

  const daysInMonth = lastDay.getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const grid = document.getElementById('calendar-grid');
  
  // Очищаем предыдущие дни (оставляем только заголовки дней недели)
  grid.innerHTML = `
    <div class="calendar-day-name">Пн</div>
    <div class="calendar-day-name">Вт</div>
    <div class="calendar-day-name">Ср</div>
    <div class="calendar-day-name">Чт</div>
    <div class="calendar-day-name">Пт</div>
    <div class="calendar-day-name">Сб</div>
    <div class="calendar-day-name">Вс</div>
  `;

  // Дни предыдущего месяца
  for (let i = firstDayIndex - 1; i > 0; i--) {
    const dayNum = prevMonthDays - i + 1;
    grid.innerHTML += `<div class="calendar-day other-month"><span class="day-number">${dayNum}</span></div>`;
  }

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, i).getDay(); // 0-Вс, 6-Сб
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = HOLIDAYS.includes(`${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    const isToday = isCurrentMonth && today.getDate() === i;

    // Фильтруем события на этот день
    const dayEvents = allEvents.filter(e => e.date === dateStr);

    let classes = 'calendar-day';
    if (isWeekend) classes += ' weekend';
    if (isHoliday) classes += ' holiday';
    if (isToday) classes += ' today';
    if (dayEvents.length > 0) classes += ' has-events';

    const eventsHtml = dayEvents.map(e => `
      <div class="calendar-event type-${e.type}" title="${e.title}">${e.title}</div>
    `).join('');

    grid.innerHTML += `
      <div class="${classes}">
        <span class="day-number">${i}</span>
        ${eventsHtml}
      </div>
    `;
  }

  // Дни следующего месяца (добиваем до ровного количества ячеек, кратного 7)
  const totalCells = firstDayIndex - 1 + daysInMonth;
  const nextMonthDays = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= nextMonthDays; i++) {
    grid.innerHTML += `<div class="calendar-day other-month"><span class="day-number">${i}</span></div>`;
  }
}

// Навигация
document.getElementById('prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  loadEvents();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  loadEvents();
});

// Запуск
loadEvents();