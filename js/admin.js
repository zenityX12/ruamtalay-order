// js/admin.js

const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6";

// เก็บออเดอร์ดิบ
let orderRaw = [];

async function loadAdminOrders() {
  document.getElementById('admin-result').innerHTML = "⏳ กำลังโหลดข้อมูล...";
  document.getElementById('admin-orders').innerHTML = "";
  const res = await fetch(scriptURL);
  const data = await res.json();
  orderRaw = data;

  // หาทุกโต๊ะที่ยังมีออเดอร์ unpaid+qty>0
  const tableMap = {};
  data.forEach(row => {
    if ((row.status ?? "unpaid") === "unpaid" && Number(row.qty) > 0) {
      tableMap[row.table] = true;
    }
  });
  const tables = Object.keys(tableMap).sort((a, b) => Number(a) - Number(b));
  const select = document.getElementById('select-table');
  select.innerHTML = '';
  tables.forEach(table => {
    select.innerHTML += `<option value="${table}">โต๊ะ ${table}</option>`;
  });

  if (!tables.length) {
    document.getElementById('admin-result').innerHTML = "🎉 ไม่มีโต๊ะที่ต้องชำระเงิน";
    document.getElementById('admin-orders').innerHTML = "";
    return;
  } else {
    document.getElementById('admin-result').innerHTML = "";
  }
  // โหลดรายการของโต๊ะแรกโดยอัตโนมัติ
  select.value = tables[0];
  renderOrderTable(tables[0]);
}

document.getElementById('select-table').onchange = function() {
  renderOrderTable(this.value);
};

function renderOrderTable(tableNum) {
  // รวมยอดออเดอร์ของโต๊ะนี้ที่ยังไม่จ่าย
  const orders = {};
  orderRaw.forEach(row => {
    if (String(row.table).trim() !== String(tableNum)) return;
    if ((row.status ?? "unpaid") !== "unpaid") return;
    if (!row.menu) return;
    if (!orders[row.menu]) {
      orders[row.menu] = {
        menu: row.menu,
        qty: 0,
        price: Number(row.price) || 0,
        note: row.note || "",
        ids: [],
      };
    }
    orders[row.menu].qty += Number(row.qty || 1);
    orders[row.menu].price = Number(row.price) || 0;
    orders[row.menu].note = row.note || "";
    orders[row.menu].ids.push(row._id || null); // ใช้ _id เฉพาะกรณีที่ SheetBest มี
  });
  const orderArr = Object.values(orders).filter(o => o.qty > 0);

  let html = "";
  if (!orderArr.length) {
    html = "<div style='color:#bbb'>ไม่มีออเดอร์ในโต๊ะนี้</div>";
    document.getElementById('admin-orders').innerHTML = html;
    return;
  }

  html += `<table class="order-table"><tr>
      <th>เมนู</th>
      <th>จำนวน</th>
      <th>ราคา</th>
      <th>หมายเหตุ</th>
      <th>ลบ</th>
    </tr>`;

  let sum = 0;
  for (const o of orderArr) {
    sum += o.qty * o.price;
    html += `<tr>
      <td>${o.menu}</td>
      <td>
        <input class="input-qty" type="number" min="1" max="99" value="${o.qty}" 
          onchange="adminUpdateQty('${tableNum}','${o.menu.replace(/'/g,"\\'")}', this.value)">
      </td>
      <td>${o.price * o.qty} ฿</td>
      <td>${o.note || ''}</td>
      <td>
        <button class="order-action-btn delete-btn" onclick="adminDeleteOrder('${tableNum}','${o.menu.replace(/'/g,"\\'")}')">ลบ</button>
      </td>
    </tr>`;
  }
  html += `<tr><td colspan="2" style="text-align:right;font-weight:bold;">รวม</td><td style="font-weight:bold;">${sum} ฿</td><td colspan="2"></td></tr>`;
  html += `</table>`;
  html += `<button class="order-action-btn" onclick="adminCheckout('${tableNum}')">✅ เช็คบิล</button>`;
  document.getElementById('admin-orders').innerHTML = html;
}

// Soft delete ด้วยการเพิ่มแถว qty ติดลบ
window.adminDeleteOrder = async function(table, menu) {
  if (!confirm(`ต้องการลบ "${menu}" ของโต๊ะ ${table} ใช่ไหม?`)) return;
  // หา qty ปัจจุบัน
  let qty = 0;
  orderRaw.forEach(row => {
    if (String(row.table).trim() === String(table) &&
        (row.status ?? "unpaid") === "unpaid" &&
        row.menu === menu) {
      qty += Number(row.qty || 1);
    }
  });
  if (qty <= 0) return;
  // ใส่แถว qty ติดลบ
  await fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: table,
      menu: menu,
      price: 0,
      qty: -qty,
      status: "unpaid",
      note: "ลบโดยแอดมิน"
    })
  });
  loadAdminOrders();
}

window.adminUpdateQty = async function(table, menu, newQty) {
  newQty = Math.max(1, Math.min(99, Number(newQty)));
  // หา qty ปัจจุบัน
  let qty = 0;
  let price = 0;
  orderRaw.forEach(row => {
    if (String(row.table).trim() === String(table) &&
        (row.status ?? "unpaid") === "unpaid" &&
        row.menu === menu) {
      qty += Number(row.qty || 1);
      price = Number(row.price) || 0;
    }
  });
  if (qty === newQty) return;
  // ใส่แถว qty = newQty - oldQty
  const diff = newQty - qty;
  if (diff === 0) return;
  await fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: table,
      menu: menu,
      price: price,
      qty: diff,
      status: "unpaid",
      note: "แก้ไขจำนวนโดยแอดมิน"
    })
  });
  loadAdminOrders();
}

window.adminCheckout = async function(table) {
  if (!confirm(`เช็คบิลโต๊ะ ${table} ยืนยัน?`)) return;
  // เปลี่ยน status = paid ให้ทุกรายการของโต๊ะนี้ที่ยัง unpaid
  let changed = false;
  for (const row of orderRaw) {
    if (String(row.table).trim() === String(table) &&
        (row.status ?? "unpaid") === "unpaid") {
      await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: table,
          menu: row.menu,
          price: row.price,
          qty: 0,
          status: "paid",
          note: "เช็คบิล"
        })
      });
      changed = true;
    }
  }
  if (changed) {
    document.getElementById('admin-result').innerHTML = "✅ เช็คบิลเรียบร้อย";
    setTimeout(()=>{document.getElementById('admin-result').innerHTML='';},2000);
    loadAdminOrders();
  }
}

// โหลดข้อมูลครั้งแรก
loadAdminOrders();

