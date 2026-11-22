// Маска для российского телефона: +7 (XXX) XXX-XX-XX
export function formatPhone(value) {
    // Оставляем только цифры
    let digits = value.replace(/\D/g, '');

    // Если начинается с 8, меняем на 7
    if (digits.startsWith('8')) {
        digits = '7' + digits.slice(1);
    }
    // Если начинается не с 7 и не пустое, добавляем 7
    if (digits && !digits.startsWith('7')) {
        digits = '7' + digits;
    }

    // Ограничиваем 11 цифрами
    digits = digits.slice(0, 11);

    // Собираем по шаблону
    let result = '';
    if (digits.length > 0) result = '+7';
    if (digits.length > 1) result += ' (' + digits.slice(1, 4);
    if (digits.length >= 5) result += ') ' + digits.slice(4, 7);
    if (digits.length >= 8) result += '-' + digits.slice(7, 9);
    if (digits.length >= 10) result += '-' + digits.slice(9, 11);

    return result;
}

// Привязывает маску к инпуту
export function attachPhoneMask(inputElement) {
    inputElement.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const oldValue = e.target.value;
        const newValue = formatPhone(oldValue);
        e.target.value = newValue;

        // Пытаемся вернуть курсор в конец, чтобы не прыгал
        if (newValue.length > oldValue.length) {
            e.target.setSelectionRange(newValue.length, newValue.length);
        } else {
            e.target.setSelectionRange(cursorPos, cursorPos);
        }
    });

    // При фокусе, если пусто, подставляем +7
    inputElement.addEventListener('focus', (e) => {
        if (!e.target.value) {
            e.target.value = '+7 (';
        }
    });

    // При потере фокуса, если ввели только +7, очищаем
    inputElement.addEventListener('blur', (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits.length <= 1) {
            e.target.value = '';
        }
    });
}
