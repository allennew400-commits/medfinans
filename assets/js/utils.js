// Формат даты: ДД.ММ.ГГГГ
export function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2, '0')}.${d.getFullYear()}`;
}

// Сортировка клиентов без учета ООО/ИП
export function sortClients(clients) {
    return clients.sort((a, b) => {
        const cleanA = a.short_name.replace(/^(ООО|ИП)\s+/i, '').trim();
        const cleanB = b.short_name.replace(/^(ООО|ИП)\s+/i, '').trim();
        return cleanA.localeCompare(cleanB, 'ru');
    });
}

// Копирование в буфер
export function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const original = btnElement.innerHTML;
        btnElement.innerHTML = '✅';
        setTimeout(() => btnElement.innerHTML = original, 1500);
    });
}

// Получить воскресенье/праздники (упрощенная логика для зарплат)
export function getAdjustedPayDate(year, month, day) {
    let d = new Date(year, month - 1, day);
    // Если суббота (6) или воскресенье (0) — переносим на пятницу
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    return formatDate(d);
}
