import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { fmtDate, escapeHtml, toast } from "./utils.js";

const ctx = await initHeader("tasks.html");
const uid = ctx.user.id;
let scope = "common";
let profileMap = {};

const { data: profs } = await supabase.from("profiles").select("id,full_name");
(profs||[]).forEach(p=>profileMap[p.id]=p.full_name);
document.getElementById("mAssignee").innerHTML = `<option value="">Для всех (общая)</option>` + (profs||[]).map(p=>`<option value="${p.id}">${escapeHtml(p.full_name)}</option>`).join("");

async function render(){
  const list = document.getElementById("list");
  let q = supabase.from("tasks").select("*");
  if(scope==="archive"){
    q = q.eq("completed",true).order("completed_at",{ascending:false});
  } else {
    q = q.eq("completed",false).eq("scope", scope==="common"?"common":"personal");
    if(scope==="personal") q = q.eq("assignee", uid);
    q = q.order("due_date",{ascending:true, nullsFirst:false});
  }
  const { data } = await q;
  const rows = data||[];
  
  list.innerHTML = rows.length ? rows.map(t=>`
    <div class="row">
      <div style="flex:1">
        <div style="font-weight:600; font-size:16px; margin-bottom:4px;">${escapeHtml(t.text)}</div>
        <div style="color:var(--text-muted); font-size:13px;">
          📅 ${t.due_date?fmtDate(t.due_date):"Без даты"} · 👤 Создал: ${escapeHtml(profileMap[t.created_by]||"—")}
          ${t.scope==="personal" && scope==="common" ? ` · 🎯 Для: ${escapeHtml(profileMap[t.assignee]||"—")}` : ""}
          ${t.recurrence!=="none"?` · 🔁 ${t.recurrence}`:""}
          ${t.completed?`<br>✅ Выполнено ${fmtDate((t.completed_at||"").slice(0,10))} — ${escapeHtml(profileMap[t.completed_by]||"")}`:""}
        </div>
      </div>
      ${!t.completed?`<button class="btn success small" data-done="${t.id}">Выполнить</button>`:""}
    </div>`).join("") : `<p style="color:var(--text-muted); text-align:center; padding:20px;">Задач нет</p>`;

  list.onclick = async (e)=>{
    const b = e.target.closest("[data-done]"); if(!b) return;
    const t = rows.find(x=>x.id===b.dataset.done);
    await supabase.from("tasks").update({ completed: true, completed_by: uid, completed_at: new Date().toISOString() }).eq("id", t.id);
    if(t.recurrence && t.recurrence!=="none" && t.due_date){
      const d = new Date(t.due_date+"T00:00:00");
      if(t.recurrence==="daily") d.setDate(d.getDate()+1);
      if(t.recurrence==="weekly") d.setDate(d.getDate()+7);
      if(t.recurrence==="monthly") d.setMonth(d.getMonth()+1);
      await supabase.from("tasks").insert({ scope: t.scope, text: t.text, due_date: d.toISOString().slice(0,10), assignee: t.assignee, recurrence: t.recurrence, created_by: uid });
    }
    render();
  };
}
render();

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x => {
    x.classList.remove("active");
    x.style.background = "transparent";
    x.style.color = "var(--text-muted)";
  });
  t.classList.add("active");
  t.style.background = "var(--primary)";
  t.style.color = "white";
  scope = t.dataset.s; render();
});

document.getElementById("addBtn").onclick = ()=>{
  document.getElementById("modal").classList.add("open");
  document.getElementById("mText").value = "";
  document.getElementById("mDate").value = "";
  document.getElementById("mRec").value = "none";
  document.getElementById("mAssignee").value = scope==="personal" ? uid : "";
  document.getElementById("assigneeField").style.display = scope==="personal" ? "none" : "block";
};
document.getElementById("mCancel").onclick = ()=>document.getElementById("modal").classList.remove("open");
document.getElementById("mSave").onclick = async ()=>{
  const text = document.getElementById("mText").value.trim();
  if(!text){ toast("Введите текст"); return; }
  const due = document.getElementById("mDate").value || null;
  const rec = document.getElementById("mRec").value;
  let assignee = document.getElementById("mAssignee").value || null;
  let s = scope==="archive" ? "common" : scope;
  if(scope==="personal" || assignee){ s="personal"; assignee = assignee||uid; }
  await supabase.from("tasks").insert({ scope: s, text, due_date: due, recurrence: rec, assignee: s==="personal"?assignee:null, created_by: uid });
  document.getElementById("modal").classList.remove("open");
  render();
};
