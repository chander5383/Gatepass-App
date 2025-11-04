let itemCount = 0;

document.addEventListener("DOMContentLoaded", function() {
  const addItemBtn = document.getElementById("addItem");
  const itemBody = document.getElementById("itemBody");
  const godownSelect = document.getElementById("godown");
  const manualGodown = document.getElementById("manualGodown");

  addItemBtn.addEventListener("click", () => {
    itemCount++;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${itemCount}</td>
      <td><input type="text" name="itemName"></td>
      <td><input type="text" name="tagNo"></td>
      <td><input type="number" name="qty"></td>
      <td>
        <select name="unit">
          <option>Kg</option>
          <option>Ltr</option>
          <option>Pcs</option>
          <option>Bag</option>
          <option>Box</option>
        </select>
      </td>
      <td><input type="text" name="remarks"></td>
      <td><button type="button" class="removeBtn">X</button></td>`;
    itemBody.appendChild(row);

    row.querySelector(".removeBtn").addEventListener("click", () => {
      row.remove();
      updateSrNo();
    });
  });

  godownSelect.addEventListener("change", function() {
    manualGodown.style.display = this.value === "Other" ? "block" : "none";
  });

  document.getElementById("printBtn").addEventListener("click", () => window.print());
});

function updateSrNo() {
  document.querySelectorAll("#itemBody tr").forEach((row, i) => {
    row.cells[0].textContent = i + 1;
  });
}
