/* Gate Pass v6 - polished
   - Professional CSS, no signature uploads
   - Two separated signature sections (each with own security fields)
   - Items add working, Tag/Sr toggle
   - GatePass numbering: GWTPL/ABOHAR/<YEAR>/<SERIAL (001)>
   - Serial resets automatically on year change
   - Local save + optional Apps Script POST (APPS_SCRIPT_URL)
   - PDF export via html2canvas + jsPDF (CDN required)
*/

const APPS_SCRIPT_URL = ""; // <-- put your Apps Script Web App URL if you want server save
const APPS_EXPECTS_JSON_RESPONSE = true; // set true if your script returns JSON with { nextSerial: N }

document.addEventListener('DOMContentLoaded', ()=>{
  initUI();
  bindButtons();
  populateFromLocal();
  addRow();
  generateLocalGP();
  document.getElementById('genOn').textContent = new Date().toLocaleString();
});

/* helpers */
const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

/* UI init */
function initUI(){
  // default date to today
  const today = new Date().toISOString().slice(0,10);
  if(!el('metaDate').value) el('metaDate').value = today;
}

/* Bind events */
function bindButtons(){
  el('btnAddRow').addEventListener('click', ()=> addRow());
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

/* Local mapping for consigner -> consignee/authority */
let CONSIGNOR_MAP = {};
function populateFromLocal(){
  CONSIGNOR_MAP = JSON.parse(localStorage.getItem('gwtpl_godown_map') || '{}');
  refreshDatalist();
}
function refreshDatalist(){
  const ds = el('recentGodowns');
  ds.innerHTML = '';
  Object.keys(CONSIGNOR_MAP).slice().reverse().forEach(k=>{
    const o = document.createElement('option'); o.value = k; ds.appendChild(o);
  });
}

/* Items table */
let itemCounter = 0;
function addRow(prefill = {}){
  itemCounter++;
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="itm-name" value="${escapeHtml(prefill.name||'')}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${escapeHtml(prefill.tag||'')}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${escapeHtml(prefill.sr||'')}" placeholder="Sr No"></td>
    <td><input class="itm-qty" type="number" min="0" value="${prefill.qty||''}"></td>
    <td><select class="itm-unit">
          <option${prefill.unit==='Nos' ? ' selected':''}>Nos</option>
          <option${prefill.unit==='Kg' ? ' selected':''}>Kg</option>
          <option${prefill.unit==='Ltr' ? ' selected':''}>Ltr</option>
          <option${prefill.unit==='Bag' ? ' selected':''}>Bag</option>
          <option${prefill.unit==='Box' ? ' selected':''}>Box</option>
          <option${prefill.unit==='Other' ? ' selected':''}>Other</option>
        </select></td>
    <td><input class="itm-remarks" value="${escapeHtml(prefill.remarks||'')}" placeholder="Remarks"></td>
    <td class="print-hidden"><button type="button" class="rm">Remove</button></td>
  `;
  tbody.appendChild(tr);

  tr.querySelector('.rm')?.addEventListener('click', ()=> { tr.remove(); renumber(); computeTotal(); });
  tr.querySelector('.itm-qty')?.addEventListener('input', ()=> computeTotal());
  tr.querySelector('.itm-unit')?.addEventListener('change', ()=> computeTotal());

  renumber(); computeTotal(); toggleColumns();
}
function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML = ''; addRow(); computeTotal(); }
function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,el)=> s + (parseFloat(el.value)||0), 0);
  el('totalQty').textContent = total;
  // subtotals by unit
  const rows = qAll('#itemsBody tr').map(tr=>({
    unit: tr.querySelector('.itm-unit').value,
    qty: parseFloat(tr.querySelector('.itm-qty').value)||0
  }));
  const subtotal = {};
  rows.forEach(r=> { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u=> `${u}: ${subtotal[u]}` );
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* Toggle Tag / Sr columns */
function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x=> x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x=> x.style.display = showSr ? '' : 'none');
  const thTag = el('thTag'); const thSr = el('thSr');
  if(thTag) thTag.style.display = showTag ? '' : 'none';
  if(thSr) thSr.style.display = showSr ? '' : 'none';
}

/* GatePass Numbering: reset per year */
function generateLocalGP(){
  const now = new Date();
  const year = now.getFullYear();
  let storedYear = localStorage.getItem('gwtpl_pass_year');
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'0', 10);

  if(!storedYear || parseInt(storedYear,10) !== year){
    // new year => reset counter
    cnt = 1;
    localStorage.setItem('gwtpl_pass_year', String(year));
    localStorage.setItem('gwtpl_pass', String(cnt));
  } else {
    if(cnt < 1) cnt = 1;
  }
  // ensure 3-digit padding
  const serial = String(cnt).padStart(3,'0');
  el('metaGpNo').textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'1',10);
  cnt++;
  localStorage.setItem('gwtpl_pass', String(cnt));
  generateLocalGP();
}

/* Validation */
function validateForm(){
  qAll('.error').forEach(e=> e.classList.remove('error'));
  let ok = true;
  // at least one item with name+qty
  const rows = qAll('#itemsBody tr').map(tr=>({
    name: tr.querySelector('.itm-name').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim()
  }));
  if(!rows.some(r=> r.name && r.qty && Number(r.qty) > 0)){
    alert('Add at least one item with name and qty');
    ok = false;
  }
  if(!el('godownManual').value.trim()){
    el('godownManual').classList.add('error'); ok = false;
  }
  // issued & received names
  if(!el('issuedName').value.trim()) el('issuedName').classList.add('error');
  if(!el('receivedName').value.trim()) el('receivedName').classList.add('error');
  return ok;
}

/* Save: local backup + optional Apps Script POST */
async function onSave(){
  if(!validateForm()) return;

  const items = qAll('#itemsBody tr').map(tr=>({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  })).filter(r=> r.name && r.qty && Number(r.qty) > 0);

  const payload = {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value || new Date().toISOString().slice(0,10),
    type: el('metaType').value,
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items: items,
    totalQty: el('totalQty').textContent,
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    outwardReg: el('outwardReg').value.trim(),
    outwardDate: el('outwardDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    inwardReg: el('inwardReg').value.trim(),
    inwardDate: el('inwardDate').value.trim(),
    remarks: el('remarks').value.trim(),
    generatedAt: new Date().toISOString()
  };

  // Save mapping for consignor -> consignee & authority
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
    CONSIGNOR_MAP = map;
    refreshDatalist();
  }

  // Try Apps Script POST if configured
  if(APPS_SCRIPT_URL){
    try{
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      if(APPS_EXPECTS_JSON_RESPONSE){
        const j = await resp.json().catch(()=>null);
        if(j && j.nextSerial) {
          localStorage.setItem('gwtpl_pass', String(j.nextSerial));
        }
      }
      saveLocalBackup(payload);
      alert('Saved (request sent). Local backup stored.');
      incrementLocal(); resetForm(); renderHistory();
      return;
    } catch(e){
      console.warn('POST failed', e);
      saveLocalBackup(payload);
      alert('Save to server failed. Data saved locally.');
      incrementLocal(); resetForm(); renderHistory();
      return;
    }
  } else {
    saveLocalBackup(payload);
    alert('APPS_SCRIPT_URL not configured. Data saved locally.');
    incrementLocal(); resetForm(); renderHistory();
  }
}

function saveLocalBackup(payload){
  const bk = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  bk.unshift(payload);
  if(bk.length > 300) bk.splice(300);
  localStorage.setItem('gwtpl_backup', JSON.stringify(bk));
}

/* Consignor change => autofill consignee/authority if mapping exists */
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  if(!v) return;
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){
    el('consignee').value = map[v].consignee || el('consignee').value;
    el('authorityPerson').value = map[v].authority || el('authorityPerson').value;
  }
}

/* History panel */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList');
  container.innerHTML = '';
  if(list.length === 0){ container.innerHTML = '<div style="padding:6px;color:#666">No local backups</div>'; return; }
  list.slice(0,40).forEach((it, idx)=>{
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.style.padding = '8px 6px'; div.style.borderBottom = '1px solid #eef6fb';
    div.innerHTML = `<div style="font-weight:700">${it.gatePassNo}</div>
                     <div style="font-size:13px;color:#444">${it.date} • ${it.consignor || ''}</div>
                     <div style="margin-top:8px">
                       <button data-idx="${idx}" class="hist-open muted">Open</button>
                       <button data-idx="${idx}" class="hist-print">Print</button>
                     </div>`;
    container.appendChild(div);
  });

  qAll('.hist-open').forEach(btn => btn.addEventListener('click', e => {
    const idx = parseInt(e.target.dataset.idx,10); openFromHistory(idx);
  }));
  qAll('.hist-print').forEach(btn => btn.addEventListener('click', e => {
    const idx = parseInt(e.target.dataset.idx,10); openFromHistory(idx, true);
  }));
}

function openFromHistory(index, autoPrint = false){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const item = list[index];
  if(!item) return alert('Item not found');
  el('metaGpNo').textContent = item.gatePassNo || '';
  el('metaDate').value = item.date || '';
  el('godownManual').value = item.consignor || '';
  el('consignee').value = item.consignee || '';
  el('vehicleNo').value = item.vehicleNo || '';
  el('personCarrying').value = item.personCarrying || '';
  el('authorityPerson').value = item.authorityPerson || '';

  el('itemsBody').innerHTML = '';
  (item.items || []).forEach(r => addRow({ name: r.name, tag: r.tag, sr: r.srno, qty: r.qty, unit: r.unit, remarks: r.remarks }));
  el('remarks').value = item.remarks || '';
  el('issuedName').value = item.issuedName || ''; el('issuedDesg').value = item.issuedDesg || '';
  el('outwardReg').value = item.outwardReg || ''; el('outwardDate').value = item.outwardDate || '';
  el('receivedName').value = item.receivedName || ''; el('receivedDesg').value = item.receivedDesg || '';
  el('inwardReg').value = item.inwardReg || ''; el('inwardDate').value = item.inwardDate || '';

  computeTotal();
  el('historyPanel').setAttribute('aria-hidden','true');
  if(autoPrint) window.print();
}

/* PDF export: create 2x2 copies on a page */
async function generatePDF(){
  const root = el('sheetRoot');
  // temporarily ensure watermark visible
  el('watermark').style.opacity = '0.06';
  const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: null });
  el('watermark').style.opacity = '';
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const cols = 2, rows = 2;
  const imgW = (pageW - margin*2) / cols;
  const imgH = (pageH - margin*2) / row*
