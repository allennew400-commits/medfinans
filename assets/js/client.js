import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { fmtDate, escapeHtml, copyText, toast } from "./utils.js";

const ctx = await initHeader("clients.html");

const params = new URLSearchParams(location.search);
const id = params.get("id");
let editing = !id;
let current = {};

const FIELDS = [
  {k:"kind", l:"Тип", t:"select", opts:["ООО","ИП"]},
  {k:"short_name", l:"Сокращённое наименование *", req:true},
  {k:"full_name", l:"Полное наименование"},
  {k:"inn", l:"ИНН"}, {k:"kpp", l:"КПП"}, {k:"ogrn", l:"ОГРН"},
  {k:"director_role", l:"Должность директора", t:"select", opts:["Директор","Генеральный директор"]},
  {k:"director_name", l:"ФИО директора"},
  {k:"director_birthday", l:"Дата рождения директора", t:"date"},
  {k:"director_phone", l:"Телефон директора"},
  {k:"email_1c", l:"Почта (1С)"},
  {k:"email_work", l:"Рабочая почта"},
  {k:"registration_date", l:"Дата регистрации", t:"date"},
  {k:"registration_authority", l:"Регистрирующий орган"},
  {k:"tax_type", l:"Вид налогообложения"},
  {k:"bank_bik", l:"Банк (БИК)"},
  {k:"account_number", l:"Номер счёта"},
  {k:"legal_address", l:"Юридический адрес"},
  {k:"actual_address", l:"Фактический адрес"},
  {k:"tax_office", l:"Налоговая инспекция"},
  {k:"okopf", l:"ОКОПФ"}, {k:"okfs", l:"ОКФС"}, {k:"okved", l:"ОКВЭД"},
  {k:"edo_astral", l:"ЭДО Калуга Астрал"},
  {k:"edo_sbis", l:"ЭДО СБИС"},
  {k:"work_start_date", l:"Начало работы", t:"date"},
  {k:"salary_day", l:"Дата зарплаты", t:"select", opts:[5,10,15,20,25,30]},
  {k:"advance_day", l:"Дата аванса", t:"select", opts:[5,10,15,20,25,30]},
];

function fieldHtml(f){
  const v = current[f.k] ?? "";
  if(f.t==="select"){
    const opts = [`<option value="">—</option>`, ...f.opts.map(o=>`<option value="${o}" ${String(o)===String(v)?"selected":""}>${o}</option>`)];
    return `<div class="field"><label>${f.l}</label><select class="input" data-k="${f.k}" ${!editing?"disabled":""}>${opts.join("")}</select></div>`;
  }
  if(f.t==="date"){
    return `<div class="field"><label>${f.l}</label><input class="input" type="date" data-k="${f.k}" value="${v||""}" ${!editing?"disabled":""}></div>`;
  }
  return `<div class="field"><label>${f.l}</label><input class="input" data-k="${f.k}" value="${escapeHtml(v)}" ${!editing?"disabled":""}></div>`;
}

async function render(){
  const box = document.getElementById("form");
  box.innerHTML = FIELDS.map(fieldHtml).join("");
  
  if(!editing){
    // Красивый вид в режиме просмотра
    box.innerHTML = FIELDS.map(f=>{
      const v = current[f.k];
      let disp = v ?? "";
      if(f.t==="date" && v) disp = fmtDate(v);
      return `<div class="kv" style="grid-column: span 1;"><span class="k">${f.l.replace(" *","")}</span><span class="v">${escapeHtml(String(disp||"—"))} ${v?`<button class="copy" data-copy="${escapeHtml(String(v))}" style="background:none; border:none; cursor:pointer; color:var(--primary); margin-left:6px;">📋</button>`:""}</span></div>`;
    }).join("");
    
    box.innerHTML += `
      <div class="kv" style="grid-column: span 1;"><span class="k">Реквизиты</span><span class="v">${current.requisites_file_url?`<a href="${current.requisites_file_url}" target="_blank">Открыть</a>`:"—"}</span></div>
      <div class="kv" style="grid-column: span 1;"><span class="k">Лицензия</span><span class="v">${current.license_file_url?`<a href="${current.license_file_url}" target="_blank">Открыть</a>`:"—"}</span></div>`;
      
    box.onclick = e=>{
      const b = e.target.closest("[data-copy]");
      if(b) copyText(b.dataset.copy);
    };
    renderNotes();
  } else {
    box.innerHTML += `
      <div class="field"><label>Файл реквизитов (PDF)</label><input class="input" type="file" id="reqFile"></div>
      <div class="field"><label>Файл лицензии (PDF)</label><input class="input" type="file" id="licFile"></div>`;
  }
  document.getElementById("title").textContent = id ? (current.short_name || "Клиент") : "Новый клиент";
}

async function renderNotes(){
  if(!id){ document.getElementById("notesBlock").innerHTML=""; return; }
  const { data: notes } = await supabase.from("client_notes").select("*, profiles(full_name)").eq("client_id", id).order("created_at",{ascending:false});
  document.getElementById("notesBlock").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3>Заметки</h3>
      <button class="btn small" id="addNote">+ Добавить заметку</button>
    </div>
    <div>
      ${(notes||[]).map(n=>`
        <div class="card" style="padding:16px; margin-bottom:12px; background:var(--bg); box-shadow:none;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:600; color:var(--primary);">${escapeHtml(n.profiles?.full_name||"")}</span>
            <span style="color:var(--text-muted); font-size:13px;">${fmtDate(n.created_at?.slice(0,10))} ${n.event_date?` (до ${fmtDate(n.event_date)})`:""}</span>
          </div>
          <p>${escapeHtml(n.text)}</p>
        </div>
      `).join("") || `<p style="color:var(--text-muted)">Заметок нет</p>`}
    </div>`;
  document.getElementById("addNote").onclick = async ()=>{
    const text = prompt("Текст заметки:"); if(!text) return;
    const dstr = prompt("Дата события (ДД.ММ.ГГГГ, можно пустым):");
    let event_date = null;
    if(dstr){
      const m = dstr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if(m) event_date = `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
    }
    await supabase.from("client_notes").insert({ client_id: id, text, event_date, created_by: ctx.user.id });
    toast("Заметка добавлена"); renderNotes();
  };
}

if(id){
  const { data } = await supabase.from("clients").select("*").eq("id", id).single();
  current = data || {};
}
await render();

document.getElementById("editBtn").onclick = ()=>{
  editing = true; document.getElementById("editBtn").classList.add("hidden");
  document.getElementById("saveBtn").classList.remove("hidden");
  document.getElementById("cancelBtn").classList.remove("hidden");
  render();
};
document.getElementById("cancelBtn").onclick = ()=>location.reload();
document.getElementById("saveBtn").onclick = async ()=>{
  const patch = {};
  document.querySelectorAll("[data-k]").forEach(el=>{
    const k = el.dataset.k;
    let v = el.value;
    if(["salary_day","advance_day"].includes(k)) v = v ? Number(v) : null;
    patch[k] = v || null;
  });
  if(!patch.short_name){ toast("Заполните наименование"); return; }

  const upFile = async (inputId, column) => {
    const f = document.getElementById(inputId)?.files?.[0];
    if(!f) return;
    const path = `clients/${Date.now()}_${f.name}`;
    const { error } = await supabase.storage.from("files").upload(path, f);
    if(error){ toast("Ошибка файла"); return; }
    const { data:{ publicUrl } } = supabase.storage.from("files").getPublicUrl(path);
    patch[column] = publicUrl;
  };
  await upFile("reqFile","requisites_file_url");
  await upFile("licFile","license_file_url");

  if(id){
    await supabase.from("clients").update(patch).eq("id", id);
    toast("Сохранено"); setTimeout(()=>location.reload(), 400);
  } else {
    patch.created_by = ctx.user.id;
    const { data, error } = await supabase.from("clients").insert(patch).select().single();
    if(error){ toast(error.message); return; }
    location.href = `client.html?id=${data.id}`;
  }
};
