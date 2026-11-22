import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { sortClients, escapeHtml } from "./utils.js";

await initHeader("clients.html");

const { data, error } = await supabase.from("clients").select("*");
if (error) alert(error.message);

let all = sortClients(data || []);
let kind = "all", q = "";

function render() {
  const items = all.filter(c => {
    if (kind !== "all" && c.kind !== kind) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.short_name || "").toLowerCase().includes(s)
      || (c.full_name || "").toLowerCase().includes(s)
      || (c.inn || "").includes(s)
      || (c.legal_address || "").toLowerCase().includes(s)
      || (c.actual_address || "").toLowerCase().includes(s);
  });
  
  document.getElementById("list").innerHTML = items.length
    ? items.map((c, i) => `
      <div class="row">
        <span class="num">${i + 1}</span>
        <div style="flex:1">
          <a href="client.html?id=${c.id}"><b>${escapeHtml(c.short_name)}</b></a>
          <div class="muted">${c.kind} · ИНН ${escapeHtml(c.inn || "—")}</div>
        </div>
      </div>`).join("")
    : `<p class="muted">Клиентов нет</p>`;
}

render();

document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  t.classList.add("active"); kind = t.dataset.kind; render();
});

document.getElementById("search").oninput = e => { q = e.target.value; render(); };