/* v8 script – GWTPL Gate Pass connected to Google Sheet */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";
const APPS_EXPECTS_JSON_RESPONSE = true;

document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init(){
  bind();
  populateFromLocal();
  addRow();
  generateLocalGP();
  document.getElementById('genOn').textContent = new Date().toLocaleString();
}

function el(id){ return document.getElementById(id); }
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

function bind(){
  el('btnAddRow').addEventListener('click', addRow);
  el('btnClearRows').addEventListener('click', clearRows);
  el('saveBtn').addEventListener('click', onSave);
  el('printBtn').addEventListener('click', ()=> window.print());
  el('pdfBtn').addEventListener('click', generatePDF);
  el('chkTag').addEventListener('change', toggleColumns);
  el('chkSr').addEventListener('change', toggleColumns);

  el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); alert('Local history cleared'); });

  el('godownManual').addEventListener('change', onConsignorChange);
}

function populateFromLocal(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns');
  ds.innerHTML = '';
  Object.keys(map).reverse().forEach(k => {
    const o = document.createElement('option'); o.value = k; ds.appendChild(o);
  });
}

/* Items logic */
let itemCounter = 0;
function addRow(prefill = {}){
  itemCounter++;
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="itm-name" value="${escape(prefill.name||'')}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${escape(prefill.tag||'')}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${escape(prefill.sr||'')}" placeholder="Sr No"></td>
    <td><input class="itm-qty" type="number" min="0" value="${prefill.qty||''}"></td>
    <td>
      <select class="itm-unit">
        <option${prefill.unit==='Nos'?' selected':''}>Nos</option>
        <option${prefill.unit==='Kg'?' selected':''}>Kg</option>
        <option${prefill.unit==='Ltr'?' selected':''}>Ltr</option>
        <option${prefill.unit==='Bag'?' selected':''}>Bag</option>
        <option${prefill.unit==='Box'?' selected':''}>Box</option>
        <option${prefill.unit==='Other'?' selected':''}>Other</option>
      </select>
    </td>
    <td><input class="itm-remarks" value="${escape(prefill.remarks||'')}" placeholder="Remarks"></td>
    <td class="hidden-print"><button type="button" class="rm">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.rm')?.addEventListener('click', ()=> { tr.remove(); renumber(); computeTotal(); });
  tr.querySelector('.itm-qty')?.addEventListener('input', computeTotal);
  tr.querySelector('.itm-unit')?.addEventListener('change', computeTotal);
  renumber();
  computeTotal();
  toggleColumns();
}

function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML = ''; addRow(); computeTotal(); }

function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s, e) => s + (parseFloat(e.value)||0), 0);
  el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({
    unit: tr.querySelector('.itm-unit').value,
    qty: parseFloat(tr.querySelector('.itm-qty').value) || 0
  }));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit] || 0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x => x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x => x.style.display = showSr ? '' : 'none');
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
}

/* Gate Pass number generator */
function generateLocalGP(){
  const now = new Date();
  const year = now.getFullYear();
  let storedYear = localStorage.getItem('gwtpl_pass_year');
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'0', 10);
  if(!storedYear || parseInt(storedYear,10) !== year){
    cnt = 1;
    localStorage.setItem('gwtpl_pass_year', String(year));
    localStorage.setItem('gwtpl_pass', String(cnt));
  } else if(cnt < 1) cnt = 1;
  const serial = String(cnt).padStart(3,'0');
  el('metaGpNo').textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'1',10);
  cnt++;
  localStorage.setItem('gwtpl_pass', String(cnt));
  generateLocalGP();
}

/* Save to Google Sheet */
async function onSave(){
  if(!validateForm()) return;

  const items = qAll('#itemsBody tr').map(tr => ({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  })).filter(r => r.name && r.qty && Number(r.qty) > 0);

  const payload = {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value || new Date().toISOString().slice(0,10),
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    issuedDate: el('issuedDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    remarks: el('remarks').value.trim(),
    generatedAt: new Date().toISOString()
  };

  // local map save
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
  }

  // send to Google Sheet
  try{
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await resp.json().catch(()=>null);
    if(j && j.nextSerial) localStorage.setItem('gwtpl_pass', String(j.nextSerial));
    saveLocal(payload);
    alert('✅ Data saved to Google Sheet & Local Backup!');
    incrementLocal(); resetForm(); renderHistory();
  }catch(e){
    console.warn('Server save failed', e);
    saveLocal(payload);
    alert('⚠️ Internet/Server error — saved locally.');
    incrementLocal(); resetForm(); renderHistory();
  }
}

/* Validation */
function validateForm(){
  qAll('.error').forEach(e=> e.classList.remove('error'));
  if(!el('godownManual').value.trim()){ el('godownManual').classList.add('error'); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({
    name: tr.querySelector('.itm-name').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim()
  }));
  if(!rows.some(r => r.name && r.qty && Number(r.qty)>0)){ alert('Add at least one valid item'); return false; }
  return true;
}

/* Local Backup */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

/* Other helpers */
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){
    el('consignee').value = map[v].consignee || el('consignee').value;
    el('authorityPerson').value = map[v].authority || el('authorityPerson').value;
  }
}
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList');
  container.innerHTML = '';
  if(!list.length){ container.innerHTML = '<div style="padding:6px;color:#666">No history</div>'; return; }
  list.slice(0,50).forEach((it,i)=>{
    const div=document.createElement('div');
    div.innerHTML=`<div><b>${it.gatePassNo}</b><br>${it.date} | ${it.consignor}</div>
    <button data-i="${i}" class="hist-open">Open</button>`;
    container.appendChild(div);
  });
  qAll('.hist-open').forEach(b=>b.addEventListener('click',e=>{
    openFromHistory(parseInt(e.target.dataset.i,10));
  }));
}
function openFromHistory(i){
  const list=JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const d=list[i]; if(!d)return;
  el('metaGpNo').textContent=d.gatePassNo; el('metaDate').value=d.date; el('godownManual').value=d.consignor;
  el('consignee').value=d.consignee; el('vehicleNo').value=d.vehicleNo; el('personCarrying').value=d.personCarrying;
  el('authorityPerson').value=d.authorityPerson; el('itemsBody').innerHTML='';
  (d.items||[]).forEach(r=>addRow({name:r.name,tag:r.tag,sr:r.srno,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  el('remarks').value=d.remarks||''; computeTotal();
  el('historyPanel').setAttribute('aria-hidden','true');
}
async function generatePDF(){
  const root = el('sheetRoot');
  const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: null });
  const img = canvas.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  pdf.addImage(img,'JPEG',0,0,210,297);
  pdf.save(`GatePass_${el('metaGpNo').textContent.replaceAll('/','_')}.pdf`);
}
function resetForm(){
  clearRows();
  ['godownManual','vehicleNo','personCarrying','authorityPerson','remarks','issuedName','issuedDesg','issuedDate','receivedName','receivedDesg','receivedDate']
    .forEach(id=>{ if(el(id)) el(id).value=''; });
  el('genOn').textContent=new Date().toLocaleString();
}
function escape(s=''){ return (''+s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
