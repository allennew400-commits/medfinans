import { supabase } from "./supabase.js";
import { escapeHtml } from "./utils.js";

// === ЛОГИКА ДЛЯ СТРАНИЦЫ ВХОДА ===
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) location.href = "app.html";
  });

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const err = document.getElementById("loginErr");
    err.textContent = "";
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { err.textContent = "Ошибка: " + error.message; return; }
    location.href = "app.html";
  };
}

// === ПРОВЕРКА АВТОРИЗАЦИИ ===
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.href = "index.html"; return null; }
  const { data: profile } = await supabase.from("profiles")
    .select("full_name").eq("id", session.user.id).single();
  return { user: session.user, profile };
}

// === СОЗДАНИЕ МЕНЮ И ШАПКИ ===
export async function initHeader(activePage) {
  const ctx = await requireAuth();
  if (!ctx) return null;
  
  const { user, profile } = ctx;
  const fullName = profile?.full_name || user.email || "Сотрудник";
  const initials = fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const nav = [
    ["app.html", "🏠 Главная"],
    ["clients.html", "👥 Клиенты"],
    ["tasks.html", "✅ Задачи"],
    ["passwords.html", "🔑 Пароли"],
    ["salary.html", "💰 Зарплаты"],
    ["reports.html", "📊 Отчётность"],
    ["payments.html", "💳 Платежи"],
    ["custom.html", "📝 Произвольное"],
    ["calendar.html", "📅 Календарь"]
  ];

  // Вставляем шапку и меню в начало body
  document.body.insertAdjacentHTML("afterbegin", `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
        <span class="brand">МЕДФИНАНС<br>ГРУПП</span>
      </div>
      <nav class="nav-links">
        ${nav.map(([href, title]) => `<a href="${href}" class="${href === activePage ? 'active' : ''}">${title}</a>`).join("")}
      </nav>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="mobile-toggle" id="mobileToggle">☰</button>
          <h1 class="page-title">${document.querySelector('.page-title')?.innerText || ''}</h1>
        </div>
        <div class="topbar-actions">
          <button class="theme-toggle" id="themeToggle" title="Сменить тему">
            ${savedTheme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div class="user-chip">
            <div class="avatar">${initials}</div>
            <span>${escapeHtml(fullName)}</span>
          </div>
          <button class="btn-logout" id="logoutBtn">Выйти</button>
        </div>
      </header>
      <div id="pageContent"></div>
    </main>
  `);

  // Переносим основной контент из старого .container в новый main
  const oldContainer = document.querySelector(".container");
  if (oldContainer) {
    // Убираем дублирующийся заголовок страницы внутри контента
    const oldH1 = oldContainer.querySelector(".page-title");
    if (oldH1) oldH1.remove();
    document.getElementById("pageContent").appendChild(oldContainer);
  }

  // Тема
  const themeBtn = document.getElementById("themeToggle");
  themeBtn.onclick = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
  };

  // Мобильное меню
  document.getElementById("mobileToggle").onclick = () => {
    document.getElementById("sidebar").classList.toggle("open");
  };

  // Выход
  document.getElementById("logoutBtn").onclick = async () => {
    if (confirm("Вы уверены, что хотите выйти?")) {
      await supabase.auth.signOut();
      location.href = "index.html";
    }
  };

  return ctx;
}
