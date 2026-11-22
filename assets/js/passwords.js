import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { sortClients, escapeHtml, copyText, toast } from "./utils.js";

const ctx = await initHeader("passwords.html");
let cat = "1c", editing = false;
let clients = [], passwords = [];

const { data: cl } = await supabase.from("clients").select("id,short_name,kind");
clients = sortClients(cl||[]);

async function load(){
  const { data } = await supabase.from("passwords").select("*").eq("category", cat);
  passwords = data||[];
  render();
}

function rowFor(client){
  const rows = passwords.filter(p=>p.client_id===client.id);
  if(cat==="banks"){
    if(!rows.length) rows.push({client_id:client.id, category:"banks"});
    return rows.map((p,i)=>`
      <div class="row">
        <div class="num">${i+1}</div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          <input class="input" placeholder="Банк" data-pid="${p.id||""}" data-f="bank_name" value="${escapeHtml(p.bank_name||"")}" ${!editing?"disabled":""}>
          <input class="input" placeholder="Логин" data-pid="${p.id||""}" data-f="login" value="${escapeHtml(p.login||"")}" ${!editing?"disabled":""}>
          <input class="input" placeholder="Пароль" data-pid="${p.id||""}" data-f="password" value="${escapeHtml(p.password||"")}" ${!editing?"disabled":""}>
        </div>
        ${!editing?`<button class="copy" data-copy="${escapeHtml(p.password||"")}">📋</button>`:""}
      </div>`).join("") +
      (editing?`<button class="btn small secondary" data-addbank="${client.id}">+ Добавить банк</button>`:"");
  }
  const p = rows[0] || {client_id:client.id, category:cat};
  const fields = [{f:"login",l:"Логин"},{f:"password",l:"Пароль"}];
  if(cat==="cash") fields.push({f:"cash_platform",l:"Касса"});
  if(cat==="ecp") fields.splice(0,1);
  return `<div class="row">
    <div style="flex:1;display:grid;grid-template-columns:2fr ${fields.map(()=>"1fr").join(" ")};gap:6px">
      <div><b>${escapeHtml(client.short_name)}</b></div>
      ${fields.map(f=>`<input class="input" placeholder="${f.l}" data-pid="${p.id||""}" data-f="${f.f}" data-cid="${client.id}" value="${escapeHtml(p[f.f]||"")}" ${!editing?"disabled":""}>`).join("")}
    </div>
    ${!editing?`<button class="copy" data-copy="${escapeHtml(p.password||"")}">📋</button>`:""}
  </div>`;
}

function render(){
  document.getElementById("table").innerHTML = clients.map(rowFor).join("") || `<p class="muted">Нет клиентов</p>`;
  document.getElementById("table").onclick = async (e)=>{
    const c = e.target.closest("[data-copy]");
    if(c) copyText(c.dataset.copy);
    const ab = e.target.closest("[data-addbank]");
    if(ab){
      const { data } = await supabase.from("passwords").insert({ category:"banks", client_id: ab.dataset.addbank, updated_by: ctx.user.id }).select().single();
      passwords.push(data); render();
    }
  };
}

document.getElementById("editToggle").onclick = ()=>{
  editing = true;
  document.getElementById("editToggle").classList.add("hidden");
  document.getElementById("saveAll").classList.remove("hidden");
  render();
};
document.getElementById("saveAll").onclick = async ()=>{
  const inputs = document.querySelectorAll("[data-pid]");
  const updates = {};
  inputs.forEach(inp=>{
    const pid = inp.dataset.pid;
    const f = inp.dataset.f;
    if(!pid){
      if(!updates["new_"+inp.dataset.cid]) updates["new_"+inp.dataset.cid] = { category: cat, client_id: inp.dataset.cid, updated_by: ctx.user.id };
      updates["new_"+inp.dataset.cid][f] = inp.value;
    } else {
      updates[pid] = updates[pid] || {id:pid};
      updates[pid][f] = inp.value;
    }
  });
  for(const k of Object.keys(updates)){
    const u = updates[k];
    if(k.startsWith("new_")) await supabase.from("passwords").insert(u);
    else {
      const { id, ...rest } = u;
      await supabase.from("passwords").update({...rest, updated_at:new Date().toISOString()}).eq("id", id);
    }
  }
  toast("Сохранено"); editing = false;
  document.getElementById("editToggle").classList.remove("hidden");
  document.getElementById("saveAll").classList.add("hidden");
  load();
};
document.getElementById("catTabs").onclick = e=>{
  const t = e.target.closest(".tab"); if(!t) return;
  document.querySelectorAll("#catTabs .tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active"); cat = t.dataset.c; editing = false;
  document.getElementById("editToggle").classList.remove("hidden");
  document.getElementById("saveAll").classList.add("hidden");
  load();
};
load();