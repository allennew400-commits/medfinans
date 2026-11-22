import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { sortClients, escapeHtml, fmtDate, toast } from "./utils.js";

const ctx = await initHeader("custom.html");

const { data: cls } = await supabase.from("clients").select("id,short_name,kind");
const clients = sortClients(cls||[]);
document.getElementById("clientChecks").innerHTML = clients.map(c=>`
  <label style="display:block"><input type="checkbox" data-cid="${c.id}"> ${escapeHtml(c.short_name)}</label>
`).join("");
document.getElementById("selAll").onchange = e=>{
  document.querySelectorAll("[data-cid]").forEach(i=>i.checked=e.target.checked);
};

async function render(){
  const { data: lists } = await supabase.from("custom_lists").select("*").order("created_at",{ascending:false});
  const box = document.getElementById("lists");
  if(!lists?.length){ box.innerHTML=`<p class="muted">Пусто</p>`; return; }
  box.innerHTML = lists.map(l=>`
    <div class="row"><div style="flex:1">
      <b>${escapeHtml(l.title)}</b> ${l.date?`— ${fmtDate(l.date)}`:""}
    </div>
    <button class="btn small secondary" data-open="${l.id}">Открыть</button>
    </div>`).join("");
  box.onclick = e=>{
    const b = e.target.closest("[data-open]"); if(b) openList(b.dataset.open);
  };
}
async function openList(id){
  const { data: list } = await supabase.from("custom_lists").select("*").eq("id", id).single();
  const { data: items } = await supabase.from("custom_list_items").select("*, clients(id,short_name,kind)").eq("list_id", id);
  const sorted = sortClients((items||[]).map(i=>({...i, short_name:i.clients?.short_name})));
  document.getElementById("lists").innerHTML = `
    <button class="btn secondary small" id="back">← Назад</button>
    <h3>${escapeHtml(list.title)}</h3>
    <button class="btn small" id="edit">Редактировать</button>
    <div style="margin-top:12px">
    ${sorted.map(it=>`
      <div class="row">
        <div style="flex:1"><b>${escapeHtml(it.clients?.short_name||"")}</b></div>
        <input class="input" style="flex:2" placeholder="Текст" value="${escapeHtml(it.note||"")}" data-note="${it.id}" disabled>
        <input class="input" type="date" style="flex:1" value="${it.date||""}" data-date="${it.id}" disabled>
      </div>`).join("")}
    </div>`;
  document.getElementById("back").onclick = render;
  document.getElementById("edit").onclick = ()=>{
    document.querySelectorAll("[data-note],[data-date]").forEach(el=>el.disabled=false);
    document.getElementById("edit").outerHTML = `<button class="btn success small" id="save">Сохранить</button>`;
    document.getElementById("save").onclick = async ()=>{
      const notes = document.querySelectorAll("[data-note]");
      for(const n of notes){
        const id = n.dataset.note;
        const d = document.querySelector(`[data-date="${id}"]`);
        await supabase.from("custom_list_items").update({
          note: n.value, date: d.value||null, updated_by: ctx.user.id, updated_at: new Date().toISOString()
        }).eq("id", id);
      }
      toast("Сохранено"); openList(id);
    };
  };
}

document.getElementById("addBtn").onclick = ()=>document.getElementById("mAdd").classList.add("open");
document.getElementById("mCancel").onclick = ()=>document.getElementById("mAdd").classList.remove("open");
document.getElementById("mCreate").onclick = async ()=>{
  const title = document.getElementById("fTitle").value.trim();
  if(!title){ toast("Введите название"); return; }
  const date = document.getElementById("fDate").value || null;
  const { data: l } = await supabase.from("custom_lists").insert({ title, date, created_by: ctx.user.id }).select().single();
  const checked = [...document.querySelectorAll("[data-cid]:checked")].map(i=>i.dataset.cid);
  if(checked.length){
    await supabase.from("custom_list_items").insert(checked.map(cid=>({list_id:l.id, client_id:cid})));
  }
  document.getElementById("mAdd").classList.remove("open");
  render();
};
render();