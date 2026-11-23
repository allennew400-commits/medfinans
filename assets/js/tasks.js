import { supabase } from './supabase.js';
import { formatDate, formatDateTime } from './utils.js';

let currentUser = null;
let currentTab = 'common'; // 'common' or 'personal'
let profilesList = [];

const container = document.getElementById('tasks-container');
const archiveContainer = document.getElementById('archive-container');
const assigneeSelect = document.getElementById('task-assignee');
const tabs = document.querySelectorAll('.tab-btn');

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  // Загружаем список сотрудников для выпадающего списка
  const { data: profiles } = await supabase.from('profiles').select('id, full_name');
  profilesList = profiles || [];
  
  if (assigneeSelect) {
    profilesList.forEach(p => {
      assigneeSelect.innerHTML += `<option value="${p.id}">${p.full_name}</option>`;
    });
  }

  loadTasks();
}

// --- ЗАГРУЗКА ЗАДАЧ ---
async function loadTasks() {
  container.innerHTML = '<div class="skeleton" style="height: 80px; margin-bottom: 12px;"></div><div class="skeleton" style="height: 80px;"></div>';
  
  let query = supabase.from('tasks').select('*, profiles!created_by(full_name), assignee_profile:profiles!assignee(full_name)');
  
  if (currentTab === 'common') {
    // Общие задачи: scope = common
    query = query.eq('scope', 'common');
  } else {
    // Личные: scope = personal AND assignee = currentUser
    query = query.eq('scope', 'personal').eq('assignee', currentUser.id);
  }

  // Сначала активные (по дате), потом выполненные
  const { data, error } = await query.order('completed', { ascending: true }).order('due_date', { ascending: true });

  if (error) { container.innerHTML = `<p class="text-danger">${error.message}</p>`; return; }

  const active = data.filter(t => !t.completed);
  const archived = data.filter(t => t.completed);

  renderTasks(active, container, false);
  renderTasks(archived, archiveContainer, true);
}

// --- РЕНДЕР ---
function renderTasks(tasks, targetEl, isArchive) {
  if (tasks.length === 0) {
    targetEl.innerHTML = `<p class="text-muted text-center" style="padding: 20px;">Задач нет.</p>`;
    return;
  }

  targetEl.innerHTML = tasks.map(t => {
    const isDone = t.completed;
    const assigneeName = t.assignee_profile?.full_name || (t.scope === 'common' ? 'Все' : 'Неизвестно');
    const creatorName = t.profiles?.full_name || 'Система';
    
    let completeInfo = '';
    if (isDone && t.completed_by && t.completed_at) {
        // Здесь в идеале нужно подтянуть имя того, кто выполнил (если есть связь), 
        // но для простоты выведем дату
        completeInfo = `<span class="text-success text-xs"><i class="fa-solid fa-check"></i> Выполнено ${formatDate(t.completed_at)}</span>`;
    }

    return `
      <div class="task-item ${isDone ? 'completed' : ''}">
        ${!isArchive ? `
          <div class="task-checkbox" onclick="window.completeTask('${t.id}')">
            <i class="fa-solid fa-check" style="opacity: 0; font-size: 12px;"></i>
          </div>
        ` : '<div style="width: 22px;"></div>'}
        
        <div class="task-content">
          <div class="task-text">${t.text}</div>
          <div class="task-meta">
            <span><i class="fa-regular fa-calendar"></i> ${t.due_date ? formatDate(t.due_date) : 'Без даты'}</span>
            <span><i class="fa-solid fa-user"></i> ${assigneeName}</span>
            <span><i class="fa-solid fa-pen"></i> Создал: ${creatorName}</span>
            ${t.recurrence !== 'none' ? `<span class="badge badge-info"><i class="fa-solid fa-rotate"></i> ${t.recurrence}</span>` : ''}
            ${completeInfo}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- СОЗДАНИЕ ЗАДАЧИ ---
document.getElementById('btn-add-task').addEventListener('click', () => {
  document.getElementById('task-modal').classList.add('active');
});

document.getElementById('btn-save-task').addEventListener('click', async () => {
  const text = document.getElementById('task-text').value.trim();
  const date = document.getElementById('task-date').value || null;
  const recurrence = document.getElementById('task-recurrence').value;
  const assigneeValue = document.getElementById('task-assignee').value;

  if (!text) { alert('Введите текст задачи!'); return; }

  // Определяем scope и assignee
  let scope = 'common';
  let assignee = null;

  if (assigneeValue !== 'all') {
    scope = 'personal';
    assignee = assigneeValue;
  } else if (currentTab === 'personal') {
    // Если мы во вкладке "Мои задачи" и выбрали "Для всех", 
    // то это странно, но пусть будет личной для текущего юзера.
    // Логичнее: в личных задачах по умолчанию ставится текущий юзер.
    scope = 'personal';
    assignee = currentUser.id;
  }

  const { error } = await supabase.from('tasks').insert({
    text,
    due_date: date,
    recurrence,
    scope,
    assignee,
    created_by: currentUser.id
  });

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    document.getElementById('task-text').value = '';
    document.getElementById('task-date').value = '';
    document.getElementById('task-modal').classList.remove('active');
    loadTasks();
  }
});

// --- ВЫПОЛНЕНИЕ ЗАДАЧИ ---
window.completeTask = async (taskId) => {
  if (!confirm('Отметить задачу как выполненную?')) return;

  const { error } = await supabase.from('tasks').update({
    completed: true,
    completed_by: currentUser.id,
    completed_at: new Date().toISOString()
  }).eq('id', taskId);

  if (error) alert('Ошибка: ' + error.message);
  else loadTasks();
};

// --- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ---
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    
    // В личных задачах по умолчанию ставим текущего юзера
    if (currentTab === 'personal') {
        assigneeSelect.value = currentUser.id;
    } else {
        assigneeSelect.value = 'all';
    }

    loadTasks();
  });
});

// Запуск
init();