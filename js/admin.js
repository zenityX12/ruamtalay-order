const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6";

let orderRaw = [];

// หา price จริงสำหรับแต่ละเมนูในโต๊ะ (ทั้ง paid/unpaid)
function getLastPrice(table, menu) {
  let price = 0;
  for (let i = orderRaw.length - 1; i >= 0; i--) {
    const row = orderRaw[i];
    if (String(row.table).trim() === String(table)
      && row.menu === menu
      && Number(row.price) > 0) {
      price = Number(row.price);
      break;
    }
  }
  return price;
}

async function loadAdminOrders() {
  document.getElementById('admin-result').innerHTML = "⏳ กำลังโหลดข้อมูล...";
  document.getElementById('admin-orders').innerHTML = "";
  const res = await fetch(scriptURL);
  const data = await res.json();
  orderRaw = data;

  // หาโต๊ะที่ยังมีออเดอร์ unpaid+qty>0 (net)
  const tableMap = {};
  // ต้องรวม net ของแต่ละเมนู
  const tableMenuNet = {};
  data.forEach(row => {
    if ((row.status ?? "unpaid") !== "unpaid") return;
    const t = row.table;
    const m = row.menu;
    if (!t || !m) return;
    if (!tableMenuNet[t]) tableMenuNet[t] = {};
    if (!tableMenuNet[t][m]) tableMenuNet[t][m] = 0;
    tableMenuNet[t][m] += Number(row.qty || 1);
  });
  Object.keys(tableMenuNet).forEach(t => {
    if (Object.values(tableMenuNet[t]).some(qty => qty > 0)) tableMap[t] = true;
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
  select.value = tables[0];
  renderOrderTable(tables[0]);
}

document.getElementById('select-table').onchange = function() {
  renderOrderTable(this.value);
};

function renderOrderTable(tableNum) {
  // ต้องรวมยอด net ของแต่ละเมนูในโต๊ะนั้น (status=unpaid)
  const menuNet = {};
  const menuPrice = {};
  const menuNote = {};
  orderRaw.forEach(row => {
    if (String(row.table).trim() !== String(tableNum)) return;
    if ((row.status ?? "unpaid") !== "unpaid") return;
    if (!row.menu) return;
    if (!menuNet[row.menu]) menuNet[row.menu] = 0;
    menuNet[row.menu] += Number(row.qty || 1);
    if (Number(row.price) > 0) menuPrice[row.menu] = Number(row.price);
    if (row.note) menuNote[row.menu] = row.note;
  });

  let html = "";
  const orderArr = Object.keys(menuNet)
    .map(menu => ({
      menu: menu,
      qty: menuNet[menu],
      price: menuPrice[menu] || getLastPrice(tableNum, menu),
      note: menuNote[menu] || ""
    }))
    .filter(o => o.qty > 0);

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

window.adminDeleteOrder = async function(table, menu) {
  if (!confirm(`ต้องการลบ "${menu}" ของโต๊ะ ${table} ใช่ไหม?`)) return;
  // หา net qty และ price จริง
  let qty = 0, price = 0;
  orderRaw.forEach(row => {
    if (String(row.table).trim() === String(table) &&
        (row.status ?? "unpaid") === "unpaid" &&
        row.menu === menu) {
      qty += Number(row.qty || 1);
      if (Number(row.price) > 0) price = Number(row.price);
    }
  });
  price = price || getLastPrice(table, menu) || 0;
  if (qty <= 0) return;
  await fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: table,
      menu: menu,
      price: price,
      qty: -qty,
      status: "unpaid",
      note: "ลบโดยแอดมิน"
    })
  });
  setTimeout(loadAdminOrders, 900);
}

window.adminUpdateQty = async function(table, menu, newQty) {
  newQty = Math.max(1, Math.min(99, Number(newQty)));
  let qty = 0, price = 0;
  orderRaw.forEach(row => {
    if (String(row.table).trim() === String(table) &&
        (row.status ?? "unpaid") === "unpaid" &&
        row.menu === menu) {
      qty += Number(row.qty || 1);
      if (Number(row.price) > 0) price = Number(row.price);
    }
  });
  price = price || getLastPrice(table, menu) || 0;
  if (qty === newQty) return;
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
  setTimeout(loadAdminOrders, 900);
}

window.adminCheckout = async function(table) {
  if (!confirm(`เช็คบิลโต๊ะ ${table} ยืนยัน?`)) return;
  // เก็บยอดล่าสุด
  const menuNet = {};
  const menuPrice = {};
  orderRaw.forEach(row => {
    if (String(row.table).trim() !== String(table)) return;
    if ((row.status ?? "unpaid") !== "unpaid") return;
    if (!row.menu) return;
    if (!menuNet[row.menu]) menuNet[row.menu] = 0;
    menuNet[row.menu] += Number(row.qty || 1);
    if (Number(row.price) > 0) menuPrice[row.menu] = Number(row.price);
  });

  for (const [menu, qty] of Object.entries(menuNet)) {
    if (qty > 0) {
      let price = menuPrice[menu] || getLastPrice(table, menu) || 0;
      await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: table,
          menu: menu,
          price: price,
          qty: -qty,
          status: "paid",
          note: "เช็คบิล"
        })
      });
    }
  }
  document.getElementById('admin-result').innerHTML = "✅ เช็คบิลเรียบร้อย";
  setTimeout(()=>{document.getElementById('admin-result').innerHTML='';},2000);
  setTimeout(loadAdminOrders, 900);
}

loadAdminOrders();
