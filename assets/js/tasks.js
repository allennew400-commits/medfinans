import { supabase } from './supabase.js';
import { formatDate } from './utils.js';

let currentUser = null;
let currentScope = 'common';

export async function initTasks(user) {
    currentUser = user;
    loadTasks();
    setupEvents();
}

async function loadTasks() {
    let query = supabase.from('tasks').select('*, profiles:created_by(full_name), completer:completed_by(full_name)');

    if (currentScope === 'common') {
        query = query.eq('scope', 'common');
    } else {
        query = query.eq('scope', 'personal').eq('assignee', currentUser.id);
    }

    const { data: tasks } = await query.order('completed', { ascending: true }).order('due_date', { ascending: true });

    const container = document.getElementById('tasksList');
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Задач нет</div>';
        return;
    }

    container.innerHTML = tasks.map(t => `
        <div class="card" style="border-left: 4px solid ${t.completed ? 'var(--success)' : 'var(--primary)'};">
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 10px; ${t.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.text}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                ${formatDate(t.due_date)} | Создал: ${t.profiles?.full_name || '—'}
            </div>
            ${t.completed
                ? `<div style="font-size: 12px; color: var(--success); font-weight: bold;">Выполнено ${t.completer?.full_name} (${formatDate(t.completed_at)})</div>`
                : `<button class="btn btn-success btn-sm complete-btn" data-id="${t.id}">Выполнить</button>`
            }
        </div>
    `).join('');

    document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            await supabase.from('tasks').update({
                completed: true,
                completed_by: currentUser.id,
                completed_at: new Date().toISOString()
            }).eq('id', id);
            loadTasks();
        });
    });
}

function setupEvents() {
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        document.getElementById('taskModal').classList.add('active');
        document.getElementById('assigneeGroup').style.display = currentScope === 'personal' ? 'none' : 'block';
    });

    document.getElementById('saveTaskBtn').addEventListener('click', async () => {
        const text = document.getElementById('taskText').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const recurrence = document.getElementById('taskRecurrence').value;
        const assigneeSelect = document.getElementById('taskAssignee').value;

        if (!text) return alert('Введите текст задачи');

        const taskData = {
            text,
            due_date: dueDate || null,
            recurrence,
            scope: currentScope,
            created_by: currentUser.id,
            assignee: currentScope === 'personal' ? currentUser.id : (assigneeSelect === 'personal' ? currentUser.id : null)
        };

        await supabase.from('tasks').insert([taskData]);
        document.getElementById('taskText').value = '';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskModal').classList.remove('active');
        loadTasks();
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentScope = e.target.dataset.scope;
            loadTasks();
        });
    });
}
