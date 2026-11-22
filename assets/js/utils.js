export function fmtDate(d){
  if(!d) return "";
  const dt = typeof d === "string" ? new Date(d+"T00:00:00") : d;
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}
export function todayStr(){ const d=new Date(); return d.toISOString().slice(0,10); }
export function daysUntil(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr+"T00:00:00");
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d-t)/86400000);
}
export function stripPrefix(name){
  return (name||"").replace(/^(ООО|ИП)\s+/i,"").trim();
}
export function sortClients(arr){
  return [...arr].sort((a,b)=> stripPrefix(a.short_name).localeCompare(stripPrefix(b.short_name),"ru"));
}
export function copyText(text, label="Скопировано"){
  navigator.clipboard.writeText(text ?? "").then(()=>toast(label));
}
export function toast(msg){
  let t=document.getElementById("toast");
  if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast";
    document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"), 1800);
}
export function escapeHtml(s){
  return (s??"").toString().replace(/[&<>"']/g, c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// Праздники РФ (основные)
export const HOLIDAYS = new Set([
  "01-01","01-02","01-03","01-04","01-05","01-06","01-07","01-08",
  "02-23","03-08","05-01","05-09","06-12","11-04"
]);
export function isWeekendOrHoliday(d){
  const wd = d.getDay();
  const md = String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  return wd===0 || wd===6 || HOLIDAYS.has(md);
}