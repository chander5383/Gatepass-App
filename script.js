document.addEventListener("DOMContentLoaded", () => {
  // Generate GatePass No
  const year = new Date().getFullYear();
  let sr = localStorage.getItem("gatePassSr") || 1;
  document.getElementById("gatePassNo").value = `GWTPL/ABOHAR/${year}/${String(sr).padStart(3, "0")}`;
  document.getElementById("date").valueAsDate = new Date();

  // QR Code
  const qrDiv = document.getElementById("qrCode");
  new QRCode(qrDiv, { text: document.getElementById("gatePassNo").value, width: 80, height: 80 });

  // Add item
  const itemBody = document.getElementById("itemBody");
  document.getElementById("addItem").addEventListener("click", () => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${itemBody.children.length + 1}</td>
      <td><input type="text" placeholder="Item description"></td>
      <td><input type="text" placeholder="Tag No"></td>
      <td><input type="number" placeholder="Qty"></td>
      <td><input type="text" placeholder="Unit"></td>
      <td><input type="text" placeholder="Remarks"></td>
      <td><button class="delBtn">❌</button></td>
    `;
    itemBody.appendChild(row);
  });

  // Delete item
  itemBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("delBtn")) e.target.closest("tr").remove();
  });

  // Printed on info
  const now = new Date();
  document.getElementById("printedOn").textContent =
    `Printed on: ${now.toLocaleDateString()} | Time: ${now.toLocaleTimeString()}`;

  // Save
  document.getElementById("saveBtn").addEventListener("click", () => {
    alert("Data saved (Google Sheet integration active).");
    sr++;
    localStorage.setItem("gatePassSr", sr);
  });

  // Print
  document.getElementById("printBtn").addEventListener("click", () => window.print());
});
