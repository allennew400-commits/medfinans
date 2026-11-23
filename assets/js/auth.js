import { supabase } from './supabase.js';

// Словарь логинов (в базе они должны быть зарегистрированы как email)
// Например: tatyana@medfinans.local
const USERS_MAP = {
  'татьяна': 'tatyana@medfinans.local',
  'лена': 'lena@medfinans.local',
  'даша': 'dasha@medfinans.local',
  'вероника': 'veronica@medfinans.local'
};

const loginForm = document.getElementById('login-form');

// --- ЛОГИКА ДЛЯ СТРАНИЦЫ ВХОДА (index.html) ---
if (loginForm) {
  // Автоподстановка логина, если он сохранялся (браузер делает это сам через атрибуты name/autocomplete)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const rawName = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    // Маппинг логина в email
    const email = USERS_MAP[rawName] || rawName; 

    btn.disabled = true;
    btn.textContent = 'Вход...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Ошибка входа: ' + (error.message === 'Invalid login credentials' ? 'Неверный логин или пароль' : error.message));
      btn.disabled = false;
      btn.textContent = 'Войти';
    } else {
      window.location.href = 'app.html'; // Успешный вход
    }
  });
}

// --- ЛОГИКА ДЛЯ ВНУТРЕННИХ СТРАНИЦ ---
if (!loginForm) {
  // Проверка сессии при загрузке (сессия живет 30 дней по умолчанию в Supabase)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      window.location.href = 'index.html'; // Выкидываем неавторизованных
    } else {
      // Показываем имя пользователя в шапке
      const userName = session.user.user_metadata.full_name || session.user.email.split('@')[0];
      const nameDisplay = document.getElementById('user-name-display');
      const avatarDisplay = document.getElementById('user-avatar');
      
      if (nameDisplay) {
        const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
        nameDisplay.textContent = formattedName;
        if (avatarDisplay) avatarDisplay.textContent = formattedName.charAt(0);
      }
    }
  });

  // Обработка кнопки выхода
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Вы уверены, что хотите выйти из системы?')) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
      }
    });
  }

  // Мобильное меню (бургер)
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
    // Закрываем меню при клике вне его
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileBtn) {
        sidebar.classList.remove('open');
      }
    });
  }
}