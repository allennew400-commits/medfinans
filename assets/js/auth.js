import { supabase } from "./supabase.js";
import { escapeHtml } from "./utils.js";

// === ЛОГИКА ДЛЯ СТРАНИЦЫ ВХОДА (index.html) ===
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  // Если пользователь уже вошел — сразу на главную
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
    if (error) {
      err.textContent = "Ошибка: " + error.message; 
      return;
    }
    location.href = "app.html";
  };
}

// === ЛОГИКА ДЛЯ ВСЕХ ОСТАЛЬНЫХ СТРАНИЦ (Шапка и Меню) ===
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.href = "index.html"; return null; }
  const { data: profile } = await supabase.from("profiles")
    .select("full_name").eq("id", session.user.id).single();
  return { user: session.user, profile };
}

export async function initHeader(activePage) {
  const ctx = await requireAuth();
  if (!ctx) return null;
  
  const { user, profile } = ctx;
  const fullName = profile?.full_name || user.email || "Сотрудник";
  const initials = fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const nav = [
    ["app.html", "Главная"],
    ["clients.html", "Клиенты"],
    ["tasks.html", "Задачи"],
    ["passwords.html", "Пароли"],
    ["salary.html", "Зарплаты"],
    ["reports.html", "Отчётность"],
    ["payments.html", "Платежи"],
    ["custom.html", "Произвольное"],
    ["calendar.html", "Календарь"]
  ];

  // Вот здесь создается красивая шапка и меню!
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="header">
      <button class="burger" id="burger">☰</button>
      <img src="assets/logo.png" class="logo" alt="" onerror="this.style.display='none'">
      <span class="brand">МЕДФИНАНС ГРУПП</span>
      <div class="spacer"></div>
      <div class="user-chip">
        <span class="avatar">${initials}</span>
        <span>${escapeHtml(fullName)}</span>
      </div>
      <button class="btn-logout" id="logoutBtn">Выйти</button>
    </header>
    <nav class="nav" id="nav">
      ${nav.map(([href, title]) => `<a href="${href}" class="${href === activePage ? 'active' : ''}">${title}</a>`).join("")}
    </nav>
  `);

  // Логика кнопки-бургера для мобилок и кнопки Выйти
  document.getElementById("burger").onclick = () => document.getElementById("nav").classList.toggle("open");
  document.getElementById("logoutBtn").onclick = async () => {
    if (confirm("Вы уверены, что хотите выйти?")) {
      await supabase.auth.signOut();
      location.href = "index.html";
    }
  };
  
  return ctx;
}
