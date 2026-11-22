import { initHeader } from "./auth.js"; // Инициализация шапки
import { supabase } from "./supabase.js";
import { fmtDate, daysUntil, escapeHtml } from "./utils.js";

// Инициализируем шапку (проверка входа и меню)
const ctx = await initHeader("app.html");
if (!ctx) throw 0;

const uid = ctx.user.id;

// 1. Задачи (общие + мои)
const { data: tasks } = await supabase.from("tasks").select("*").eq("completed", false);
const shown = (tasks || []).filter(t => {
  if (t.scope === "common") return true;
  return t.assignee === uid;
}).filter(t => {
  if (!t.due_date) return true;
  const d = daysUntil(t.due_date); return d >= 0 && d <= 7;
}).sort((a,b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")).slice(0, 10);

document.getElementById("dTasks").innerHTML = shown.length
  ? shown.map(t => `<div class="kv"><span class="k">${fmtDate(t.due_date)} · ${t.scope==="common"?"общая":"личная"}</span><span class="v">${escapeHtml(t.text)}</span></div>`).join("")
  : `<p class="muted">Нет ближайших задач</p>`;

// 2. Дни рождения
const { data: cl } = await supabase.from("clients").select("short_name,director_name,director_birthday");
const bd = (cl || []).filter(c => c.director_birthday).map(c => {
  const b = new Date(c.director_birthday);
  const now = new Date();
  let nd = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (nd < new Date(now.getFullYear(), now.getMonth(), now.getDate())) nd.setFullYear(now.getFullYear() + 1);
  return { ...c, _days: Math.round((nd - now) / 86400000), _date: nd };
}).filter(x => x._days <= 14).sort((a,b) => a._days - b._days);

document.getElementById("dBirth").innerHTML = bd.length
  ? bd.map(x => `<div class="kv"><span class="k">${fmtDate(x._date)} (через ${x._days} дн.)</span><span class="v">${escapeHtml(x.short_name)} — ${escapeHtml(x.director_name || "")}</span></div>`).join("")
  : `<p class="muted">Нет ближайших ДР</p>`;

// 3. Заметки
const { data: notes } = await supabase.from("client_notes").select("*, clients(short_name)").not("event_date", "is", null);
const nsh = (notes || []).filter(n => {
  const d = daysUntil(n.event_date); return d >= 0 && d <= 7;
}).sort((a,b) => a.event_date.localeCompare(b.event_date));

document.getElementById("dNotes").innerHTML = nsh.length
  ? nsh.map(n => `<div class="kv"><span class="k">${fmtDate(n.event_date)}</span><span class="v"><b>${escapeHtml(n.clients?.short_name || "")}</b><br>${escapeHtml(n.text)}</span></div>`).join("")
  : `<p class="muted">Нет ближайших заметок</p>`;

// 4. Зарплаты
const { data: runs } = await supabase.from("salary_runs").select("*").eq("paid", false);
const rs = (runs || []).filter(r => { const d = daysUntil(r.pay_date); return d >= 0 && d <= 7; }).sort((a,b) => a.pay_date.localeCompare(b.pay_date));

document.getElementById("dSalary").innerHTML = rs.length
  ? rs.map(r => `<div class="kv"><span class="k">${fmtDate(r.pay_date)}</span><span class="v">${r.kind}</span></div>`).join("")
  : `<p class="muted">Нет выплат на неделю</p>`;

// 5. Отчётность
const { data: reps } = await supabase.from("reports").select("*").eq("done", false);
const rep = (reps || []).filter(r => { const d = daysUntil(r.due_date); return d >= 0 && d <= 7; }).sort((a,b) => a.due_date.localeCompare(b.due_date));

document.getElementById("dRep").innerHTML = rep.length
  ? rep.map(r => `<div class="kv"><span class="k">${fmtDate(r.due_date)}</span><span class="v">${escapeHtml(r.title)}</span></div>`).join("")
  : `<p class="muted">Нет отчётов на неделю</p>`;

// 6. Обязательные платежи
const { data: pays } = await supabase.from("payments").select("*, clients(short_name)").eq("done", false);
const pp = (pays || []).filter(p => { const d = daysUntil(p.pay_date); return d >= 0 && d <= 7; }).sort((a,b) => a.pay_date.localeCompare(b.pay_date));

document.getElementById("dPay").innerHTML = pp.length
  ? pp.map(p => `<div class="kv"><span class="k">${fmtDate(p.pay_date)}</span><span class="v"><b>${escapeHtml(p.clients?.short_name || "")}</b> — ${escapeHtml(p.title)} <button class="btn success small" data-pay="${p.id}">Выполнено</button></span></div>`).join("")
  : `<p class="muted">Нет платежей на неделю</p>`;

document.getElementById("dPay").onclick = async (e) => {
  const btn = e.target.closest("[data-pay]"); if (!btn) return;
  if (!confirm("Отметить платёж выполненным?")) return;
  await supabase.from("payments").update({ done: true }).eq("id", btn.dataset.pay);
  btn.closest(".kv").remove();
};