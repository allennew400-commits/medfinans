import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { fmtDate, escapeHtml, sortClients, toast } from "./utils.js";

const ctx = await initHeader("reports.html");

async function render(){
  const { data: runs } = await supabase.from("reports").select("*").order("due_date",{ascending:false});
  const box = document.getElementById("runs");
  if(!runs?.length){ box.innerHTML = `<p class="muted">Пусто</p>`; return; }
  box.innerHTML = runs.map(r=>`
    <div class="row">
      <div style="flex:1"><b>${escapeHtml(r.title)}</b> — ${fmtDate(r.due_date)}
        ${r.done?`<span class="pill green">Сдано всем</span>`:`<span class="pill yellow">В работе</span>`}
      </div>
      <button class="btn small secondary" data-open="${r.id}">Открыть</button>
      <button class="btn small ${r.done?'warn':'success'}" data-toggle="${r.id}" data-done="${r.done}">
        ${r.done?"Отменить":"Выполнено"}
      </button>
    </div>`).join("");
  box.onclick = async (e)=>{
    const op = e.target.closest("[data-open]"); if(op){ openRun(op.dataset.open); return; }
    const tg = e.target.closest("[data-toggle]"); if(!tg) return;
    const isDone = tg.dataset.done==="true";
    if(!confirm(isDone ? "Отменить статус?" : "Отчётность сдана по всем организациям?")) return;
    await supabase.from("reports").update({done: !isDone}).eq("id", tg.dataset.toggle);
    render();
  };
}
async function openRun(id){
  const { data: run } = await supabase.from("reports").select("*").eq("id", id).single();
  const { data: items } = await supabase.from("report_items").select("*, clients(id,short_name,kind)").eq("report_id", id);
  const s = sortClients((items||[]).map(i=>({...i, short_name:i.clients?.short_name})));
  document.getElementById("runs").innerHTML = `
    <button class="btn secondary small" id="back">← Назад</button>
    <h3>${escapeHtml(run.title)} — ${fmtDate(run.due_date)}</h3>
    ${s.map((it,i)=>`
      <div class="row">
        <div class="num">${i+1}</div>
        <div style="flex:1"><b>${escapeHtml(it.clients?.short_name||"")}</b></div>
        <select class="input" style="width:auto" data-item="${it.id}">
          <option value="not_submitted" ${it.status==="not_submitted"?"selected":""}>Не сдано</option>
          <option value="submitted" ${it.status==="submitted"?"selected":""}>Сдано</option>
          <option value="not_applicable" ${it.status==="not_applicable"?"selected":""}>Не применяется</option>
        </select>
      </div>`).join("")}`;
  document.getElementById("back").onclick = render;
  document.querySelectorAll("[data-item]").forEach(s=>{
    s.onchange = async ()=>{
      await supabase.from("report_items").update({status:s.value}).eq("id", s.dataset.item);
      toast("Обновлено");
    };
  });
}
document.getElementById("addBtn").onclick = ()=>document.getElementById("mAdd").classList.add("open");
document.getElementById("mCancel").onclick = ()=>document.getElementById("mAdd").classList.remove("open");
document.getElementById("mCreate").onclick = async ()=>{
  const title = document.getElementById("fTitle").value.trim();
  const date = document.getElementById("fDate").value;
  if(!title || !date){ toast("Заполните все поля"); return; }
  const { data: run } = await supabase.from("reports").insert({ title, due_date: date, created_by: ctx.user.id }).select().single();
  const { data: clients } = await supabase.from("clients").select("id");
  if(clients?.length){
    await supabase.from("report_items").insert(clients.map(c=>({report_id: run.id, client_id:c.id})));
  }
  document.getElementById("mAdd").classList.remove("open");
  render();
};
render();