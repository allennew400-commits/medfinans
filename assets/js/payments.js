import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { sortClients, fmtDate, escapeHtml, toast } from "./utils.js";

const ctx = await initHeader("payments.html");
const { data } = await supabase.from("clients").select("id,short_name,kind");
const list = sortClients(data||[]);
document.getElementById("clients").innerHTML = list.map((c,i)=>`
  <div class="row"><div class="num">${i+1}</div>
    <a style="flex:1" href="#" data-open="${c.id}"><b>${escapeHtml(c.short_name)}</b></a>
  </div>`).join("");

document.getElementById("clients").onclick = async (e)=>{
  const a = e.target.closest("[data-open]"); if(!a) return;
  e.preventDefault();
  const c = list.find(x=>x.id===a.dataset.open);
  await openClient(c);
};

async function openClient(client){
  const { data: pays } = await supabase.from("payments").select("*").eq("client_id", client.id).order("pay_date",{ascending:false});
  document.getElementById("clients").innerHTML = `
    <button class="btn secondary small" id="back">← Назад</button>
    <h3>${escapeHtml(client.short_name)}</h3>
    <button class="btn" id="addP">+ Добавить платёж</button>
    <div style="margin-top:12px">
      ${(pays||[]).map(p=>`
        <div class="row">
          <div style="flex:1"><b>${escapeHtml(p.title)}</b> — ${fmtDate(p.pay_date)}
            ${p.done?`<span class="pill green">Выполнено</span>`:`<span class="pill red">Не выполнено</span>`}</div>
          <button class="btn small ${p.done?'warn':'success'}" data-t="${p.id}" data-d="${p.done}">
            ${p.done?"Отменить":"Выполнено"}</button>
        </div>`).join("") || `<p class="muted">Нет платежей</p>`}
    </div>`;
  document.getElementById("back").onclick = ()=>location.reload();
  document.getElementById("addP").onclick = async ()=>{
    const title = prompt("Название платежа:"); if(!title) return;
    const dstr = prompt("Дата (ДД.ММ.ГГГГ):");
    const m = (dstr||"").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(!m){ toast("Неверная дата"); return; }
    await supabase.from("payments").insert({
      client_id: client.id, title,
      pay_date: `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`,
      created_by: ctx.user.id
    });
    openClient(client);
  };
  document.querySelectorAll("[data-t]").forEach(b=>{
    b.onclick = async ()=>{
      const done = b.dataset.d==="true";
      if(!confirm(done?"Отменить?":"Отметить выполненным?")) return;
      await supabase.from("payments").update({done: !done}).eq("id", b.dataset.t);
      openClient(client);
    };
  });
}