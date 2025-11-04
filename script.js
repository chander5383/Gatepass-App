const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzNTGVczqgRCHVG0-ahE8xytNhCMJWubAu3blkIj25sJ7lATtTQi4l2pAqB-XsizWlaXQ/exec";

let itemCount = 0;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addItemBtn").addEventListener("click", addItemRow);
  document.getElementById("generateBtn").addEventListener("click", generateGatePass);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("resetBtn").addEventListener("click", () => location.reload());

  // Add first item row
  addItemRow();

  // Load clusters/godowns
  loadConsignorUnits();
});

function addItemRow() {
  itemCount++;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${itemCount}</td>
    <td><input type="text" placeholder="Item Name"></td>
    <td><input type="number" min="1" value="1"></td>
    <td><input type="text" placeholder="Serial No"></td>
    <td><input type="text" placeholder="Tag No"></td>
  `;
  document.getElementById("itemRows").appendChild(row);
}

function generateGatePass() {
  const gatePassNo = document.getElementById("gatePassNumber").textContent.replace("Gate Pass No: ", "");
  const date = document.getElementById("dateField").value;
  const consignor = document.getElementById("consignorUnit").value;
  const vehicleNo = document.getElementById("vehicleNo").value;
  const carriedBy = document.getElementById("carriedBy").value;
  const remarks = document.getElementById("remarks").value;
  const issuedBy = document.getElementById("issuedBy").value;
  const designation = document.getElementById("designation").value;

  const items = [];
  document.querySelectorAll("#itemRows tr").forEach(tr => {
    const cells = tr.querySelectorAll("input");
    items.push({
      item: cells[0].value,
      qty: cells[1].value,
      serial: cells[2].value,
      tag: cells[3].value
    });
  });

  const data = {
    gatePassNo,
    date,
    consignor,
    vehicleNo,
    carriedBy,
    remarks,
    issuedBy,
    designation,
    items
  };

  // Send to Google Sheet
  fetch(appsScriptUrl, {
    method: "POST",
    body: JSON.stringify(data)
  })
  .then(res => alert("✅ Data Saved to Google Sheet Successfully!"))
  .catch(err => alert("❌ Error saving data: " + err));

  // QR code generate
  const qrDiv = document.getElementById("qrCode");
  qrDiv.innerHTML = "";
  new QRCode(qrDiv, {
    text: gatePassNo,
    width: 100,
    height: 100
  });

  // Timestamp
  const ts = new Date().toLocaleString();
  document.getElementById("timestamp").textContent = "Printed on: " + ts;
}

function loadConsignorUnits() {
  const consignorList = ["Cluster-1 Godown", "Cluster-2 Godown", "Cluster-3 Godown"];
  const select = document.getElementById("consignorUnit");
  consignorList.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  });
}
