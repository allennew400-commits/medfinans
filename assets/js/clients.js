import { supabase } from './supabase.js';
import { sortClients, maskPhone } from './utils.js';

console.log("Скрипт clients.js успешно загружен!");

let allClients = [];
let currentFilter = 'all';
let searchQuery = '';

// Безопасное получение элементов
const container = document.getElementById('clients-container');
const searchInput = document.getElementById('search-input');
const tabs = document.querySelectorAll('.tab-btn');
const addModal = document.getElementById('add-client-modal');
const btnOpenModal = document.getElementById('btn-open-add-modal');
const btnSaveClient = document.getElementById('btn-save-client');

// Проверка, что все элементы на месте
if (!container) console.error("Не найден контейнер #clients-container");
if (!searchInput) console.error("Не найдено поле поиска #search-input");
if (!addModal) console.error("Не найдено модальное окно #add-client-modal");
if (!btnOpenModal) console.error("Не найдена кнопка открытия модалки #btn-open-add-modal");
if (!btnSaveClient) console.error("Не найдена кнопка сохранения #btn-save-client");

// --- ЗАГРУЗКА И РЕНДЕР ---
async function fetchClients() {
  console.log("Загрузка клиентов из Supabase...");
  const { data, error } = await supabase.from('clients').select('*');
  
  if (error) {
    console.error("Ошибка Supabase:", error);
    if (container) container.innerHTML = `<p class="text-danger">Ошибка загрузки: ${error.message}</p>`;
    return;
  }
  
  console.log("Клиенты загружены:", data);
  allClients = data || [];
  renderClients();
}

function renderClients() {
  if (!container) return;

  let filtered = allClients;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(c => c.kind === currentFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(c => 
      (c.short_name && c.short_name.toLowerCase().includes(q)) ||
      (c.inn && c.inn.includes(q)) ||
      (c.legal_address && c.legal_address.toLowerCase().includes(q))
    );
  }

  filtered.sort(sortClients);

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 40px;">Клиенты не найдены</p>`;
    return;
  }

  container.innerHTML = filtered.map((client, index) => `
    <div class="client-card" onclick="window.location.href='client.html?id=${client.id}'">
      <div class="client-card-header">
        <div class="client-card-title">${index + 1}. ${client.short_name}</div>
        <span class="client-card-inn">${client.kind || 'Орг.'}</span>
      </div>
      <div class="client-card-info"><i class="fa-solid fa-hashtag"></i> ИНН: ${client.inn || '—'}</div>
      <div class="client-card-info"><i class="fa-solid fa-location-dot"></i> ${client.legal_address || 'Адрес не указан'}</div>
      <div class="client-card-info"><i class="fa-solid fa-user-tie"></i> ${client.director_name || 'Директор не указан'}</div>
    </div>
  `).join('');
}

// --- ОБРАБОТЧИКИ (с проверкой на существование) ---
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderClients();
  });
}

if (tabs) {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderClients();
    });
  });
}

if (btnOpenModal) {
  btnOpenModal.addEventListener('click', () => {
    console.log("Кнопка добавления нажата");
    if (addModal) addModal.classList.add('active');
    const phoneInput = document.getElementById('add-director-phone');
    if (phoneInput && !phoneInput.dataset.masked) {
      maskPhone(phoneInput);
      phoneInput.dataset.masked = 'true';
    }
  });
}

if (btnSaveClient) {
  btnSaveClient.addEventListener('click', async () => {
    console.log("Кнопка сохранения нажата");
    const shortName = document.getElementById('add-short-name')?.value.trim();

    if (!shortName) {
      alert('Поле "Краткое наименование" обязательно для заполнения!');
      return;
    }

    btnSaveClient.disabled = true;
    btnSaveClient.innerHTML = 'Сохранение...';

    const newClient = {
      kind: document.getElementById('add-kind')?.value,
      short_name: shortName,
      full_name: document.getElementById('add-full-name')?.value || null,
      inn: document.getElementById('add-inn')?.value || null,
      kpp: document.getElementById('add-kpp')?.value || null,
      ogrn: document.getElementById('add-ogrn')?.value || null,
      registration_date: document.getElementById('add-reg-date')?.value || null,
      tax_type: document.getElementById('add-tax-type')?.value || null,
      director_role: document.getElementById('add-director-role')?.value,
      director_name: document.getElementById('add-director-name')?.value || null,
      director_birthday: document.getElementById('add-director-bday')?.value || null,
      director_phone: document.getElementById('add-director-phone')?.value || null,
      email_work: document.getElementById('add-email-work')?.value || null,
      email_1c: document.getElementById('add-email-1c')?.value || null,
      bank_bik: document.getElementById('add-bank-bik')?.value || null,
      account_number: document.getElementById('add-account-number')?.value || null,
      legal_address: document.getElementById('add-legal-address')?.value || null,
      actual_address: document.getElementById('add-actual-address')?.value || null,
      edo_astral: document.getElementById('add-edo-astral')?.value || null,
      edo_sbis: document.getElementById('add-edo-sbis')?.value || null,
      salary_day: document.getElementById('add-salary-day')?.value || null,
      advance_day: document.getElementById('add-advance-day')?.value || null,
      work_start_date: document.getElementById('add-work-start-date')?.value || null,
    };

    console.log("Отправка данных:", newClient);

    const { error } = await supabase.from('clients').insert([newClient]);

    if (error) {
      console.error("Ошибка вставки:", error);
      alert('Ошибка при создании: ' + error.message);
    } else {
      console.log("Клиент успешно добавлен");
      document.getElementById('add-client-form')?.reset();
      if (addModal) addModal.classList.remove('active');
      await fetchClients();
    }

    btnSaveClient.disabled = false;
    btnSaveClient.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Сохранить клиента';
  });
}

// --- ЗАПУСК ---
fetchClients();
