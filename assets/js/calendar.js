import { initHeader } from "./auth.js";
import { supabase } from "./supabase.js";
import { fmtDate, escapeHtml, HOLIDAYS } from "./utils.js";

await initHeader("calendar.html");

let cur = new Date();
const MN = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

async function render(){
  document.getElementById("monthTitle").textContent = `${MN[cur.getMonth()]} ${cur.getFullYear()}`;
  const year = cur.getFullYear(), month = cur.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay()+6)%7;
  const start = new Date(year, month, 1-startDay);
  const cells = 42;
  const from = start.toISOString().slice(0,10);
  const end = new Date(start.getTime() + cells*86400000).toISOString().slice(0,10);

  const [{ data: tasks }, { data: runs }, { data: reps }, { data: pays }, { data: cls }] = await Promise.all([
    supabase.from("tasks").select("*").gte("due_date",from).lte("due_date",end),
    supabase.from("salary_runs").select("*").gte("pay_date",from).lte("pay_date",end),
    supabase.from("reports").select("*").gte("due_date",from).lte("due_date",end),
    supabase.from("payments").select("*").gte("pay_date",from).lte("pay_date",end),
    supabase.from("clients").select("short_name,director_name,director_birthday").not("director_birthday","is",null)
  ]);

  const evByDate = {};
  const add = (d, type, txt) => { (evByDate[d]=evByDate[d]||[]).push({type,txt}); };
  (tasks||[]).forEach(t=>t.due_date && add(t.due_date,"task", t.text));
  (runs||[]).forEach(r=>add(r.pay_date,"salary", r.kind));
  (reps||[]).forEach(r=>add(r.due_date,"report", r.title));
  (pays||[]).forEach(p=>add(p.pay_date,"payment", p.title));
  (cls||[]).forEach(c=>{
    const b = new Date(c.director_birthday);
    if(b.getMonth()===month){
      const d = new Date(year, month, b.getDate()).toISOString().slice(0,10);
      add(d,"birthday", `🎂 ${c.short_name}`);
    }
  });

  const today = new Date(); today.setHours(0,0,0,0);
  let html = "";
  for(let i=0;i<cells;i++){
    const d = new Date(start.getTime() + i*86400000);
    const ds = d.toISOString().slice(0,10);
    const md = String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const isHol = HOLIDAYS.has(md);
    const otherMonth = d.getMonth()!==month;
    const isToday = d.getTime()===today.getTime();
    const evs = evByDate[ds]||[];
    html += `<div class="cal-cell ${otherMonth?"other":""} ${isToday?"today":""}">
      <span class="dnum ${isHol?"holiday":""}">${d.getDate()}</span>
      ${evs.slice(0,4).map(e=>`<div class="cal-event ${e.type}" title="${escapeHtml(e.txt)}">${escapeHtml(e.txt)}</div>`).join("")}
    </div>`;
  }
  document.getElementById("grid").innerHTML = html;
}
document.getElementById("prev").onclick = ()=>{ cur.setMonth(cur.getMonth()-1); render(); };
document.getElementById("next").onclick = ()=>{ cur.setMonth(cur.getMonth()+1); render(); };
document.getElementById("today").onclick = ()=>{ cur = new Date(); render(); };
render();