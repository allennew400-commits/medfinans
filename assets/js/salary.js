import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { fmtDate, escapeHtml, sortClients, toast, isWeekendOrHoliday } from "./utils.js";

const ctx = await initHeader("salary.html");

function shiftToWorkday(dateStr){
  const d = new Date(dateStr+"T00:00:00");
  while(isWeekendOrHoliday(d)) d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}

async function render(){
  const { data: runs } = await supabase.from("salary_runs").select("*").order("pay_date",{ascending:false});
  const box = document.getElementById("runs");
  if(!runs?.length){ box.innerHTML = `<p class="muted">Пока пусто</p>`; return; }
  box.innerHTML = runs.map(r=>`
    <div class="row">
      <div style="flex:1">
        <b>${r.kind} — ${fmtDate(r.pay_date)}</b>
        ${r.paid?`<span class="pill green">Оплачено</span>`:`<span class="pill yellow">Не оплачено</span>`}
      </div>
      <button class="btn small secondary" data-open="${r.id}">Открыть</button>
      <button class="btn small ${r.paid?'warn':'success'}" data-toggle="${r.id}" data-paid="${r.paid}">
        ${r.paid?"Отменить":"Выполнено"}
      </button>
    </div>`).join("");
  box.onclick = async (e)=>{
    const op = e.target.closest("[data-open]");
    if(op){ openRun(op.dataset.open); return; }
    const tg = e.target.closest("[data-toggle]");
    if(tg){
      const isPaid = tg.dataset.paid === "true";
      const q = isPaid ? "Отменить статус «оплачено»?" : "Выплата произведена всем?";
      if(!confirm(q)) return;
      await supabase.from("salary_runs").update({paid: !isPaid}).eq("id", tg.dataset.toggle);
      render();
    }
  };
}

async function openRun(id){
  const { data: run } = await supabase.from("salary_runs").select("*").eq("id", id).single();
  const { data: items } = await supabase.from("salary_items").select("*, clients(id,short_name,kind)").eq("run_id", id);
  const itemsSorted = sortClients((items||[]).map(i=>({...i, short_name:i.clients?.short_name, kind:i.clients?.kind})));
  document.getElementById("runs").innerHTML = `
    <button class="btn secondary small" id="back">← Назад</button>
    <h3>${run.kind} — ${fmtDate(run.pay_date)}</h3>
    <div>${itemsSorted.map((it,i)=>`
      <div class="row">
        <div class="num">${i+1}</div>
        <div style="flex:1"><b>${escapeHtml(it.clients?.short_name||"")}</b></div>
        <select class="input" style="width:auto" data-item="${it.id}">
          <option value="not_accrued" ${it.status==="not_accrued"?"selected":""}>Не начислено</option>
          <option value="accrued" ${it.status==="accrued"?"selected":""}>Начислено</option>
          <option value="paid" ${it.status==="paid"?"selected":""}>Выплачено</option>
        </select>
      </div>`).join("")}</div>`;
  document.getElementById("back").onclick = render;
  document.querySelectorAll("[data-item]").forEach(sel=>{
    sel.onchange = async ()=>{
      await supabase.from("salary_items").update({status: sel.value}).eq("id", sel.dataset.item);
      toast("Обновлено");
    };
  });
}

document.getElementById("addBtn").onclick = ()=>document.getElementById("mAdd").classList.add("open");
document.getElementById("mCancel").onclick = ()=>document.getElementById("mAdd").classList.remove("open");
document.getElementById("mCreate").onclick = async ()=>{
  const kind = document.getElementById("fKind").value;
  let date = document.getElementById("fDate").value;
  if(!date){ toast("Выберите дату"); return; }
  const realDate = shiftToWorkday(date);
  const day = new Date(date+"T00:00:00").getDate();

  const { data: clients } = await supabase.from("clients").select("id,salary_day,advance_day");
  const matched = (clients||[]).filter(c=>{
    if(kind==="salary") return c.salary_day===day;
    if(kind==="advance") return c.advance_day===day;
    return false;
  });
  const { data: run } = await supabase.from("salary_runs").insert({ kind, pay_date: realDate, created_by: ctx.user.id }).select().single();
  if(matched.length){
    await supabase.from("salary_items").insert(matched.map(c=>({run_id: run.id, client_id: c.id})));
  }
  document.getElementById("mAdd").classList.remove("open");
  render();
};

render();