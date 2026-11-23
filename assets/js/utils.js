// Формат даты: 25.11.2026
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}

// Формат даты и времени для задач: 25.11.2026 в 14:30
export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date).replace(',', ' в');
}

// Копирование в буфер обмена с визуальным откликом
export async function copyToClipboard(text, btnElement) {
  try {
    await navigator.clipboard.writeText(text);
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-check" style="color: var(--success);"></i>';
    btnElement.classList.add('copied');
    setTimeout(() => { 
      btnElement.innerHTML = originalHtml; 
      btnElement.classList.remove('copied');
    }, 1500);
  } catch (err) {
    console.error('Ошибка копирования: ', err);
  }
}

// Маска телефона: +7 (999) 999-99-99
export function maskPhone(input) {
  input.addEventListener('input', (e) => {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
    if (!x[2]) {
      e.target.value = x[1] ? '+7 ' : '';
    } else {
      e.target.value = '+7 (' + x[2] + (x[3] ? ') ' + x[3] : '') + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
    }
  });
}

// Сортировка клиентов (игнорируя префиксы ООО и ИП)
export function sortClients(a, b) {
  const cleanName = (name) => (name || '').replace(/^(ООО|ИП)\s+/i, '').toLowerCase();
  return cleanName(a.short_name).localeCompare(cleanName(b.short_name));
}

// Расчет даты выплаты с учетом выходных (перенос на пятницу)
export function adjustForWeekends(year, month, day) {
  // month от 0 до 11
  let date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  
  // 0 - Вс, 6 - Сб
  if (dayOfWeek === 6) { // Суббота -> Пятница
    date.setDate(date.getDate() - 1);
  } else if (dayOfWeek === 0) { // Воскресенье -> Пятница
    date.setDate(date.getDate() - 2);
  }
  // Примечание: Праздники РФ здесь можно добавить массивом и проверять, 
  // но для базовой логики переноса выходных этого достаточно.
  return date;
}