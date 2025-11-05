/* script.js — GWTPL Gate Pass v15.5
   Save to Google Sheet + local backup + diagnostics + print-friendly
*/

let rowCount = 0;

/* ======= CONFIG ======= */
// Deploy your Apps Script Web App and paste the URL here (must accept POST from anyone with link)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE/exec";

/* ======= UI helpers ======= */
function el(id){ return document.getElementById(id); }

/* ======= ROW / TABLE MANAGEMENT ======= */
function addRow(){
  const tbody = el('tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${++rowCount}</td>
    <td><input placeholder="Item description"></td>
    <td class="col-tag"><input placeholder="Tag No"></td>
    <td class="col-sr"><input placeholder="Sr No"></td>
    <td><input type="number" min="0" value="0" onchange="recalc()"></td>
    <td>
      <select>
        <option>Nos</option>
        <option>Kg</option>
        <option>Ltr</option>
        <option>Box</option>
        <option>Bag</option>
        <option>Set</option>
        <option>Roll</option>
        <option>Packet</option>
      </select>
    </td>
    <td><input placeholder="Remarks"></td>
    <td><button class="btn muted" onclick="removeRow(this)">Remove</button></td>
  `;
  tbody.appendChild(tr);
  toggleCols();
  recalc();
}

function removeRow(btn){
  const tr = btn.closest('tr');
  tr.remove();
  recalc();
}

function clearItems(){
  el('tbody').innerHTML = '';
  rowCount = 0;
  addRow();
  recalc();
}

/* show/hide columns (Tag / Sr) */
function toggleCols(){
  const showTag = el('showTag').checked;
  const showSr = el('showSr').checked;
  document.querySelectorAll('.col-tag').forEach(c => c.style.display = showTag ? '' : 'none');
  document.querySelectorAll('.col-sr').forEach(c => c.style.display = showSr ? '' : 'none');
}

/* recalc totals and unit subtotals */
function recalc(){
  let total = 0;
  const units = {}; // { unitName: qtySum }
  document.querySelectorAll('#tbody tr').forEach(tr => {
    const qtyInput = tr.querySelector('td:nth-child(5) input');
    const unitSelect = tr.querySelector('td:nth-child(6) select');
    const qty = parseFloat(qtyInput.value) || 0;
    const unit = unitSelect.value || 'Nos';
    total += qty;
    units[unit] = (units[unit] || 0) + qty;
  });
  el('totalQty').innerText = total;
  renderUnitSubtotals(units);
}

/* show unit subtotals */
function renderUnitSubtotals(units){
  const wrap = el('unitSubtotal');
  wrap.innerHTML = '';
  const keys = Object.keys(units);
  if(keys.length === 0) return;
  keys.forEach(k => {
    const chunk = document.createElement('div');
    chunk.className = 'chunk';
    chunk.innerText = `${k} — ${units[k]}`;
    wrap.appendChild(chunk);
  });
}

/* ======= FORM DATA COLLECTION & VALIDATION ======= */
function collectFormData(){
  const items = [];
  document.querySelectorAll('#tbody tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    items.push({
      sr: tds[0].innerText.trim(),
      item: (tds[1].querySelector('input')?.value || '').trim(),
      tag: (tds[2].querySelector('input')?.value || '').trim(),
      srno: (tds[3].querySelector('input')?.value || '').trim(),
      qty: (tds[4].querySelector('input')?.value || '').trim(),
      unit: (tds[5].querySelector('select')?.value || '').trim(),
      remarks: (tds[6].querySelector('input')?.value || '').trim()
    });
  });

  return {
    gpNo: el('gpNo').value.trim(),
    date: el('gpDate').value.trim(),
    type: el('gpType').value.trim(),
    consignor: el('consignor').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicle: el('vehicle').value.trim(),
    person: el('person').value.trim(),
    authority: el('authority').value.trim(),
    consignDate: el('consignDate').value.trim(),
    remarks: el('remarks').value.trim(),
    totalQty: el('totalQty').innerText.trim(),
    items,
    issuedSecurityDate: el('issuedSecurityDate').value.trim(),
    outwardSr: el('outwardSr').value.trim(),
    issuedName: el('issuedName').value.trim(),
    issuedDesig: el('issuedDesig').value.trim(),
    receivedSecurityDate: el('receivedSecurityDate').value.trim(),
    inwardSr: el('inwardSr').value.trim(),
    receivedName: el('receivedName').value.trim(),
    receivedDesig: el('receivedDesig').value.trim(),
    savedAt: new Date().toISOString()
  };
}

function validateData(data){
  if(!data.consignor) return "Enter Consignor (Godown)";
  if(!data.date) return "Select Date (top right) manually";
  if(data.items.length === 0) return "Add at least one item";
  // at least one item description and qty > 0
  const hasValidItem = data.items.some(i => i.item && parseFloat(i.qty) > 0);
  if(!hasValidItem) return "Add at least one item with qty > 0";
  return null;
}

/* ======= SAVE TO SHEET ======= */
async function saveToSheet(){
  const data = collectFormData();
  const v = validateData(data);
  if(v){ alert(v); logError(v); return; }

  // UI disable while saving
  setStatus("Saving...");
  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data),
      mode: "cors"
    });
    if(!resp.ok){
      const txt = await resp.text();
      throw new Error("Server returned " + resp.status + " — " + txt);
    }
    const resJson = await resp.json().catch(()=>({status:'ok'}));
    setStatus("Saved ✓ " + new Date().toLocaleString());
    saveLocalBackup(data, 'synced');
    showSuccess("Saved to Google Sheet");
    resetFormAfterSave();
  } catch(err){
    console.error("Save error:", err);
    setStatus("Save failed — saved locally");
    saveLocalBackup(data, 'failed:' + (err.message||err));
    logError("Save failed: " + (err.message || err));
    alert("Save failed: saved locally. See diagnostics for details.");
  }
}

/* ======= LOCAL BACKUP & DIAGNOSTICS ======= */
function saveLocalBackup(data, status){
  const key = "gwtpl_backup_v15";
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.unshift({meta:{ts:new Date().toISOString(),status}, payload:data});
  while(list.length > 200) list.pop();
  localStorage.setItem(key, JSON.stringify(list));
  renderDiagnostics();
}

function renderDiagnostics(){
  const key = "gwtpl_backup_v15";
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  const last = list[0];
  const lastStatusEl = el('lastStatus');
  const errorLog = el('errorLog');
  if(last){
    lastStatusEl.innerText = `Last save: ${new Date(last.meta.ts).toLocaleString()} — ${last.meta.status}`;
  } else {
    lastStatusEl.innerText = "Last save: —";
  }
  const errs = JSON.parse(localStorage.getItem('gwtpl_errors') || "[]");
  if(errs.length){
    errorLog.innerText = errs.slice(0,5).join(" | ");
  } else {
    errorLog.innerText = "";
  }
}

function logError(msg){
  const key = 'gwtpl_errors';
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.unshift(new Date().toLocaleString() + " — " + msg);
  while(arr.length > 50) arr.pop();
  localStorage.setItem(key, JSON.stringify(arr));
  renderDiagnostics();
}

function showSuccess(msg){
  // simple small flash
  el('lastStatus').style.color = "green";
  setTimeout(()=>el('lastStatus').style.color = "", 2500);
}

/* ======= RESET FORM ======= */
function resetFormAfterSave(){
  // don't wipe everything — clear items and remarks to let user continue
  el('remarks').value = "";
  clearItems();
}

/* ======= UTILITIES ======= */
function downloadJSON(){
  const data = collectFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `gatepass_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

/* ======= INIT ======= */
window.addEventListener('load', () => {
  addRow(); // default one row
  recalc();
  renderDiagnostics();
  // default columns: showTag false, showSr false for compact
  el('showTag').checked = false;
  el('showSr').checked = false;
  toggleCols();
});
