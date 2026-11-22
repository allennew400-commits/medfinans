import { supabase } from './supabase.js';

// Проверка сессии на всех страницах кроме index.html
export async function checkAuth() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') return;

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        window.location.href = 'index.html';
        return null;
    }
    
    // Получаем профиль
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    
    // Рендер хедера
    const headerContainer = document.getElementById('user-header');
    if (headerContainer && profile) {
        headerContainer.innerHTML = `
            <span>Привет, <b>${profile.full_name}</b></span>
            <button class="btn-logout" id="logoutBtn">Выйти</button>
        `;
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }
    return profile;
}

// Вход
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}
