// == CONFIG ==
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAXIhKxmeBkMhAPVh24PSbTcfSh-1oBEXBj7OFEnAXx-Uy_PzmL7UZkql3rUUpmHeJRQz5oXCzp8Cy/pub?output=csv";
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzNTGVczqgRCHVG0-ahE8xytNhCMJWubAu3blkIj25sJ7lATtTQi4l2pAqB-XsizWlaXQ/exec";

// == AUTO GATEPASS ==
let passCount = localStorage.getItem('gatepassCount') || 1;
const gatePassNo = document.getElementById('gatePassNo');
gatePassNo.value = `GWTPL/ABO/2025/${String(passCount).padStart(3, '0')}`;

// == FETCH SHEET DATA ==
async function loadSheet() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const clusterSet = [...new Set(rows.slice(1).map(r => r[0]))];
  const clusterSelect = document.getElementById('cluster');
  const godownSelect = document.getElementById('godown');
  const locationInput = document.getElementById('location');

  clusterSet.forEach(c => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = c.trim();
    clusterSelect.appendChild(opt);
  });

  clusterSelect.addEventListener('change', () => {
    const val = clusterSelect.value;
    const filtered = rows.filter(r => r[0] === val);
    godownSelect.innerHTML = "";
    filtered.forEach(r => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = r[4];
      godownSelect.appendChild(opt);
    });
    locationInput.value = filtered[0][3];
  });
}
loadSheet();

// == ADD ITEMS ==
let itemNo = 1;
document.getElementById('addItem').addEventListener('click', () => {
  const tbody = document.getElementById('itemBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${itemNo++}</td>
    <td><input type="text" class="iname"></td>
    <td><input type="number" class="iqty"></td>
    <td><input type="text" class="itag"></td>
    <td><input type="checkbox" class="returnable"></td>
  `;
  tbody.appendChild(tr);
});

// == SAVE TO SHEET ==
document.getElementById('saveBtn').addEventListener('click', async () => {
  const data = {
    passNo: gatePassNo.value,
    date: document.getElementById('date').value,
    cluster: document.getElementById('cluster').value,
    godown: document.getElementById('godown').value,
    location: document.getElementById('location').value,
    vehicleNo: document.getElementById('vehicleNo').value,
    authority: document.getElementById('authority').value,
    issuedBy: document.getElementById('issuedBy').value,
    designation: document.getElementById('designation').value,
    items: []
  };

  document.querySelectorAll('#itemBody tr').forEach(tr => {
    data.items.push({
      name: tr.querySelector('.iname').value,
      qty: tr.querySelector('.iqty').value,
      tag: tr.querySelector('.itag').value,
      returnable: tr.querySelector('.returnable').checked
    });
  });

  await fetch(appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data)
  });

  alert("✅ Gate pass saved!");
  passCount++;
  localStorage.setItem('gatepassCount', passCount);
  gatePassNo.value = `GWTPL/ABO/2025/${String(passCount).padStart(3, '0')}`;
});

// == PRINT ==
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});
