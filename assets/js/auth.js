import { supabase } from "./supabase.js";

// Если уже вошел — на главную
const { data: { session } } = await supabase.auth.getSession();
if (session) location.href = "app.html";

const form = document.getElementById("loginForm");
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const err = document.getElementById("loginErr");
    err.textContent = "";
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) { err.textContent = error.message; return; }
    location.href = "app.html";
  };
}
