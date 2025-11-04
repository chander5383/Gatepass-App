/* v10.3 script - grouped + QR + Google Sheet integration */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";
const APPS_EXPECTS_JSON_RESPONSE = true;

document.addEventListener('DOMContentLoaded', () => { boot(); });

/* helpers */
const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

function boot(){
  bind();
  populateDatalist();
  addRow(); // ensure one item row
  generateLocalGP();
  el('metaDate').value = new Date().toISOString().slice(0,10);
  el('genOn').textContent = new Date().toLocaleString();
  renderCopiesFromForm(); // initial render
}

/* binding events */
function bind(){
  el('btnAddRow').addEventListener('click', addRow);
  el('btnClearRows').addEventListener('click', clearRows);
  el('saveBtn').addEventListener('click', onSave);
  el('printBtn').addEventListener('click', printCurrent);
  el('pdfBtn').addEventListener('click', exportPDF);
  el('chkTag').addEventListener('change', toggleColumns);
  el('chkSr').addEventListener('change', toggleColumns);

  el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); });

  el('godownManual').addEventListener('change', onConsignorChange);

  // update copies whenever form/input changes
  qAll('input,select,textarea').forEach(inp => inp.addEventListener('input', ()=> { computeTotal(); renderCopiesFromForm(); }));
  el('itemsBody').addEventListener('input', ()=> { computeTotal(); renderCopiesFromForm(); });
}

/* datalist from local map */
function populateDatalist(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns'); ds.innerHTML = '';
  Object.keys(map).reverse().forEach(k => { const o=document.createElement('option'); o.value=k; ds.appendChild(o); });
}

/* Items table */
let itemCounter = 0;
function addRow(prefill = {}){
  itemCounter++;
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="itm-name" value="${escapeHTML(prefill.name||'')}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${escapeHTML(prefill.tag||'')}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${escapeHTML(prefill.sr||'')}" placeholder="Sr No"></td>
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
    <td><input class="itm-remarks" value="${escapeHTML(prefill.remarks||'')}" placeholder="Remarks"></td>
    <td class="action-col"><button type="button" class="btn muted rm">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.rm').addEventListener('click', ()=> { tr.remove(); renumber(); computeTotal(); renderCopiesFromForm(); });
  tr.querySelector('.itm-qty').addEventListener('input', ()=> { computeTotal(); renderCopiesFromForm(); });
  tr.querySelector('.itm-unit').addEventListener('change', ()=> { computeTotal(); renderCopiesFromForm(); });
  renumber(); computeTotal(); toggleColumns(); renderCopiesFromForm();
}
function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotal(); renderCopiesFromForm(); }

/* totals & subtotals */
function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,e) => s + (parseFloat(e.value)||0), 0);
  el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({unit: tr.querySelector('.itm-unit').value, qty: parseFloat(tr.querySelector('.itm-qty').value)||0}));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* toggle tag/sr columns */
function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x => x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x => x.style.display = showSr ? '' : 'none');
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
  renderCopiesFromForm();
}

/* GatePass numbering */
function generateLocalGP(){
  const now = new Date(); const year = now.getFullYear();
  const storedYear = localStorage.getItem('gwtpl_pass_year');
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'0',10);
  if(!storedYear || parseInt(storedYear,10) !== year){
    cnt = 1; localStorage.setItem('gwtpl_pass_year', String(year)); localStorage.setItem('gwtpl_pass', String(cnt));
  } else if(cnt < 1) cnt = 1;
  const serial = String(cnt).padStart(3,'0');
  el('metaGpNo').textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){ let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'1',10); cnt++; localStorage.setItem('gwtpl_pass', String(cnt)); generateLocalGP(); }

/* validate */
function validateForm(){
  qAll('.error').forEach(e => e.classList.remove('error'));
  if(!el('godownManual').value.trim()){ el('godownManual').classList.add('error'); el('godownManual').focus(); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({name: tr.querySelector('.itm-name').value.trim(), qty: tr.querySelector('.itm-qty').value.trim()}));
  if(!rows.some(r => r.name && r.qty && Number(r.qty) > 0)){ alert('Add at least one item with valid qty'); return false; }
  return true;
}

/* Save to Google Sheet + local backup */
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
    unitSub: el('unitSubtotals').textContent.replace('Subtotals — ',''),
    remarks: el('remarks').value.trim(),
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    issuedDate: el('issuedDate').value || '',
    issueSecName: el('issueSecName').value.trim(),
    issueSecReg: el('issueSecReg').value.trim(),
    issueSecDate: el('issueSecDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    receivedDate: el('receivedDate').value || '',
    recSecName: el('recSecName').value.trim(),
    recSecReg: el('recSecReg').value.trim(),
    recSecDate: el('recSecDate').value || '',
    generatedAt: new Date().toISOString()
  };

  // save mapping locally
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
  }

  // attempt server save
  try{
    const resp = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await resp.json().catch(()=>null);
    if(j && j.nextSerial) localStorage.setItem('gwtpl_pass', String(j.nextSerial));
    saveLocal(payload);
    alert('Saved → Google Sheet & Local backup.');
    incrementLocal(); resetForm(); renderHistory();
  }catch(e){
    console.warn('Server save failed', e);
    saveLocal(payload);
    alert('Server error — saved locally.');
    incrementLocal(); resetForm(); renderHistory();
  }
}

/* local backup */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

/* history render/open/print */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList'); container.innerHTML='';
  if(!list.length){ container.innerHTML = '<div style="color:#666;padding:8px">No saved records</div>'; return; }
  list.slice(0,100).forEach((it, idx) => {
    const node = document.createElement('div'); node.className='hist-row'; node.style.padding='8px'; node.style.borderBottom='1px solid #eef6fb';
    node.innerHTML = `<div style="font-weight:700">${it.gatePassNo} • ${it.date}</div>
      <div style="font-size:13px;color:#444">${it.consignor || ''}</div>
      <div style="margin-top:8px">
        <button data-i="${idx}" class="btn muted hist-open">Open</button>
        <button data-i="${idx}" class="btn hist-print">Print</button>
      </div>`;
    container.appendChild(node);
  });
  qAll('.hist-open').forEach(b => b.addEventListener('click', e => openFromHistory(parseInt(e.target.dataset.i,10))));
  qAll('.hist-print').forEach(b => b.addEventListener('click', e => printFromHistory(parseInt(e.target.dataset.i,10))));
}

function openFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  // fill form
  el('metaGpNo').textContent = it.gatePassNo || ''; el('metaDate').value = it.date || '';
  el('godownManual').value = it.consignor || ''; el('consignee').value = it.consignee || '';
  el('vehicleNo').value = it.vehicleNo || ''; el('personCarrying').value = it.personCarrying || ''; el('authorityPerson').value = it.authorityPerson || '';
  el('itemsBody').innerHTML = ''; (it.items||[]).forEach(r => addRow({name:r.name,tag:r.tag,sr:r.srno,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  el('remarks').value = it.remarks || '';
  el('issuedName').value = it.issuedName || ''; el('issuedDesg').value = it.issuedDesg || ''; el('issuedDate').value = it.issuedDate || '';
  el('issueSecName').value = it.issueSecName || ''; el('issueSecReg').value = it.issueSecReg || ''; el('issueSecDate').value = it.issueSecDate || '';
  el('receivedName').value = it.receivedName || ''; el('receivedDesg').value = it.receivedDesg || ''; el('receivedDate').value = it.receivedDate || '';
  el('recSecName').value = it.recSecName || ''; el('recSecReg').value = it.recSecReg || ''; el('recSecDate').value = it.recSecDate || '';
  computeTotal(); renderCopiesFromForm(); el('historyPanel').setAttribute('aria-hidden','true');
}

function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  renderCopiesFromData(it);
  setTimeout(()=> window.print(), 400);
}

/* render copies (two stacked) from current form */
function renderCopiesFromForm(){
  const data = collectFormData();
  renderCopiesFromData(data);
}

/* build both copies from data */
function renderCopiesFromData(data){
  // compute unitSub for display if missing
  if(!data.unitSub){
    data.unitSub = Array.isArray(data.items) ? (() => {
      const s={}; (data.items||[]).forEach(it => { s[it.unit] = (s[it.unit]||0) + (parseFloat(it.qty)||0); });
      return Object.keys(s).map(u => `${u}: ${s[u]}`).join(' | ');
    })() : '';
  }
  el('copyTop').innerHTML = buildCopyHtml(data, 'Office Copy');
  el('copyBottom').innerHTML = buildCopyHtml(data, 'Security Copy');

  // generate QR for both copies
  generateQRCodeForCopy('copyTop', data);
  generateQRCodeForCopy('copyBottom', data);
}

/* build html string for one copy */
function buildCopyHtml(d, label){
  const itemsHtml = (d.items||[]).map(r => `
    <tr>
      <td style="border:1px solid #e9f4f9;padding:8px">${escapeHTML(r.sr||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px">${escapeHTML(r.name||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px">${escapeHTML(r.tag||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px">${escapeHTML(r.srno||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px;text-align:center">${escapeHTML(r.qty||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px;text-align:center">${escapeHTML(r.unit||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:8px">${escapeHTML(r.remarks||'')}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#666;padding:18px">No items</td></tr>`;

  const header = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <img src="https://gwtpl.co/logo.png" style="width:80px">
      <div style="flex:1;text-align:center">
        <div style="font-weight:800;color:#0a4b76;font-size:18px">GLOBUS WAREHOUSING &amp; TRADING PRIVATE LIMITED</div>
        <div style="font-weight:700;color:#0b4a61;margin-top:4px">ABOHAR</div>
        <div style="font-weight:800;color:#0b4a61;margin-top:8px">STOCK TRANSFER VOUCHER</div>
      </div>
      <div style="width:260px">
        <div style="font-size:12px;color:#666">${label}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Gate Pass No</div>
        <div style="border:1px solid #222;padding:8px;font-weight:800;background:#fafafa;margin-bottom:6px">${escapeHTML(d.gatePassNo||'')}</div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><div style="font-size:12px;color:#666">Date</div><div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(d.date||'')}</div></div>
          <div style="flex:1"><div style="font-size:12px;color:#666">Type</div><div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(d.type||'')}</div></div>
        </div>
      </div>
    </div>`;

  const details = `
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <tr>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="font-weight:700;color:#12323b;margin-bottom:6px">Consignor (Godown)</div>
          <div>${escapeHTML(d.consignor||'')}</div>
        </td>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="font-weight:700;color:#12323b;margin-bottom:6px">Consignee Unit</div>
          <div>${escapeHTML(d.consignee||'')}</div>
        </td>
        <td style="width:34%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="display:flex;gap:8px">
            <div style="flex:1"><div style="font-weight:700;color:#12323b">Vehicle No</div><div>${escapeHTML(d.vehicleNo||'')}</div></div>
            <div style="flex:1"><div style="font-weight:700;color:#12323b">Person Carrying</div><div>${escapeHTML(d.personCarrying||'')}</div></div>
          </div>
        </td>
      </tr>
    </table>`;

  const table = `
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead>
        <tr style="background:#f7fbfd;color:#12323b;font-weight:800">
          <th style="padding:8px;border:1px solid #e9f4f9;width:6%">Sr</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:44%">Item Description</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:12%">Tag No</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:10%">Sr No</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:8%">Qty</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:8%">Unit</th>
          <th style="padding:8px;border:1px solid #e9f4f9;width:12%">Remarks</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;border:1px solid #e9f4f9;padding:8px;font-weight:700">Total Qty</td>
          <td style="border:1px solid #e9f4f9;padding:8px;text-align:center;font-weight:700">${escapeHTML(d.totalQty||'0')}</td>
          <td colspan="2" style="border:1px solid #e9f4f9;padding:8px"></td>
        </tr>
        <tr>
          <td colspan="7" style="padding:8px;border:1px solid #e9f4f9;color:#12323b">Subtotals — ${escapeHTML(d.unitSub||'')}</td>
        </tr>
      </tfoot>
    </table>`;

  const remarks = `
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:12px">
      <div style="flex:1;border:1px solid #e9f4f9;padding:8px;border-radius:6px">
        <div style="font-weight:700;color:#12323b;margin-bottom:6px">Remarks</div>
        <div style="min-height:40px">${escapeHTML(d.remarks||'')}</div>
      </div>
      <div style="width:180px;text-align:center">
        <div style="font-size:12px;color:#666;margin-bottom:8px">Generated on</div>
        <div style="font-size:12px;color:#333">${escapeHTML(d.generatedAt ? (new Date(d.generatedAt)).toLocaleString() : (new Date()).toLocaleString())}</div>
        <div id="qr-placeholder" style="margin-top:8px"></div>
      </div>
    </div>`;

  const signatures = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignee / Issued By</div>
        <div>Name: ${escapeHTML(d.issuedName||'')}</div>
        <div>Designation: ${escapeHTML(d.issuedDesg||'')}</div>
        <div>Date: ${escapeHTML(d.issuedDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp &amp; Sign</div>
        <hr style="margin:10px 0">
        <div style="font-weight:700">For Security</div>
        <div>Name: ${escapeHTML(d.issueSecName||'')}</div>
        <div>Register Sr: ${escapeHTML(d.issueSecReg||'')}</div>
        <div>Date: ${escapeHTML(d.issueSecDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp (Security)</div>
      </div>

      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignor / Received By</div>
        <div>Name: ${escapeHTML(d.receivedName||'')}</div>
        <div>Designation: ${escapeHTML(d.receivedDesg||'')}</div>
        <div>Date: ${escapeHTML(d.receivedDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp &amp; Sign</div>
        <hr style="margin:10px 0">
        <div style="font-weight:700">For Security</div>
        <div>Name: ${escapeHTML(d.recSecName||'')}</div>
        <div>Register Sr: ${escapeHTML(d.recSecReg||'')}</div>
        <div>Date: ${escapeHTML(d.recSecDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp (Security)</div>
      </div>
    </div>`;

  return `<div style="position:relative;z-index:1">${header}${details}${table}${remarks}${signatures}</div>`;
}

/* collect form data */
function collectFormData(){
  const items = qAll('#itemsBody tr').map(tr => ({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  }));
  return {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value,
    type: el('metaType').value,
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    unitSub: el('unitSubtotals').textContent.replace('Subtotals — ',''),
    remarks: el('remarks').value.trim(),
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    issuedDate: el('issuedDate').value || '',
    issueSecName: el('issueSecName').value.trim(),
    issueSecReg: el('issueSecReg').value.trim(),
    issueSecDate: el('issueSecDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    receivedDate: el('receivedDate').value || '',
    recSecName: el('recSecName').value.trim(),
    recSecReg: el('recSecReg').value.trim(),
    recSecDate: el('recSecDate').value || '',
    generatedAt: new Date().toISOString()
  };
}

/* QR generation: create QR inside copy container's qr-placeholder element */
function generateQRCodeForCopy(copyId, data){
  const container = el(copyId);
  if(!container) return;
  // find the placeholder inside the copy's generated HTML
  const placeholder = container.querySelector('#qr-placeholder');
  if(!placeholder) return;
  placeholder.innerHTML = ''; // clear old
  const qrText = `GatePass No: ${data.gatePassNo}\nDate: ${data.date}\nConsignor: ${data.consignor}\nTotalQty: ${data.totalQty}`;
  // create QR with qrcodejs
  new QRCode(placeholder, {
    text: qrText,
    width: 110,
    height: 110,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
}

/* print current form (renders and prints) */
function printCurrent(){
  renderCopiesFromForm();
  setTimeout(()=> window.print(), 400);
}

/* export PDF (one A4 with two stacked copies) */
async function exportPDF(){
  renderCopiesFromForm();
  const paper = document.querySelector('.paper');
  el('paper').style.background = '#ffffff';
  const canvas = await html2canvas(paper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, 'JPEG', 0, 0, w, h);
  const gp = el('metaGpNo').textContent.replaceAll('/','_') || 'GatePass';
  pdf.save(`GatePass_${gp}.pdf`);
}

/* reset form */
function resetForm(){
  clearRows();
  ['godownManual','vehicleNo','personCarrying','authorityPerson','remarks',
   'issuedName','issuedDesg','issuedDate','issueSecName','issueSecReg','issueSecDate',
   'receivedName','receivedDesg','receivedDate','recSecName','recSecReg','recSecDate'].forEach(id => { if(el(id)) el(id).value=''; });
  el('genOn').textContent = new Date().toLocaleString();
  renderCopiesFromForm();
}

/* utility */
function escapeHTML(s=''){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

/* autofill consignor mapping */
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){ el('consignee').value = map[v].consignee || el('consignee').value; el('authorityPerson').value = map[v].authority || el('authorityPerson').value; }
}
