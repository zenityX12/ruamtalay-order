// js/app.js

// ==== CONFIG ====
const MENUS = window.MENU_GROUPS;
const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6"; // เปลี่ยน URL ตามของคุณ

// ==== CART ====
let cart = {};

function renderMenuList() {
  let html = '';
  MENUS.forEach(group => {
    html += `<div class="section"><div class="section-title">${group.group}</div>`;
    group.items.forEach((item, idx) => {
      html += `
        <div class="menu-item">
          <span class="item-name">${item.name}</span>
          <span class="item-price">${item.price} ฿</span>
          <button class="add-btn" onclick="addToCart('${item.name.replace(/'/g,"\\'")}', ${item.price})">+</button>
        </div>`;
    });
    html += '</div>';
  });
  document.getElementById('menu-list').innerHTML = html;
}

function renderCart() {
  let html = '';
  let total = 0, count = 0;
  Object.keys(cart).forEach(name => {
    const qty = cart[name].qty;
    if (qty > 0) {
      total += qty * cart[name].price;
      count += qty;
      html += `
      <div class="cart-row">
        <span class="cart-name">${name}</span>
        <span class="cart-price">${cart[name].price * qty} ฿</span>
        <input type="number" min="1" max="99" value="${qty}" onchange="setQty('${name.replace(/'/g,"\\'")}', this.value)">
        <button class="cart-remove" onclick="removeFromCart('${name.replace(/'/g,"\\'")}')">ลบ</button>
      </div>`;
    }
  });
  html += `<div id="total">รวม ${total} ฿</div>`;
  document.getElementById('cart').innerHTML = html || "<div style='color:#bbb'>ยังไม่มีสินค้าในตะกร้า</div>";
  document.getElementById('cart-count').textContent = count ? count : '';
  document.getElementById('order-btn').disabled = count === 0;
}

window.addToCart = function(name, price) {
  if (!cart[name]) cart[name] = { qty: 0, price: price };
  cart[name].qty += 1;
  renderCart();
  // shake effect
  const cartIcon = document.getElementById('cart-icon-box');
  cartIcon.classList.remove('shake');
  void cartIcon.offsetWidth;
  cartIcon.classList.add('shake');
  setTimeout(() => cartIcon.classList.remove('shake'), 400);
}

window.setQty = function(name, val) {
  val = Math.max(1, Math.min(99, Number(val)));
  cart[name].qty = val;
  renderCart();
}

window.removeFromCart = function(name) {
  if (cart[name]) {
    cart[name].qty -= 1;
    if (cart[name].qty <= 0) delete cart[name];
    renderCart();
  }
}

window.scrollToCart = function() {
  document.getElementById('cart').scrollIntoView({ behavior: "smooth" });
}

// ==== ORDER ====
document.getElementById('order-btn').onclick = async function() {
  const tableNum = getTableNumber();
  if (!tableNum) return alert('ไม่พบหมายเลขโต๊ะ');
  const note = document.getElementById('note').value;
  document.getElementById('order-btn').disabled = true;
  document.getElementById('thankyou').classList.remove('hide');
  for (const [name, item] of Object.entries(cart)) {
    for (let i = 0; i < item.qty; i++) {
      await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableNum,
          menu: name,
          price: item.price,
          qty: 1,
          status: "unpaid",
          note: note
        })
      });
    }
  }
  cart = {};
  renderCart();
  setTimeout(() => {
    document.getElementById('thankyou').classList.add('hide');
    document.getElementById('note').value = '';
    fetchOrderHistory();
  }, 1500);
};

// ==== TABLE ====
function getTableNumber() {
  const url = new URL(window.location.href);
  let t = url.searchParams.get('table');
  if (!t) {
    const hash = url.hash.replace("#", "");
    if (/^\d+$/.test(hash)) t = hash;
  }
  document.getElementById('table-number').textContent = t ? "โต๊ะ " + t : "";
  return t;
}

// ==== HISTORY ====
function getUnpaidOrderSummary(data, tableNum) {
  const rows = data.filter(
    i => String(i.table).trim() === String(tableNum) && (i.status ?? "unpaid") === "unpaid"
  );
  const summary = {};
  rows.forEach(row => {
    const qty = Number(row.qty || 1);
    if (!summary[row.menu]) summary[row.menu] = { qty: 0, price: Number(row.price) || 0 };
    summary[row.menu].qty += qty;
    summary[row.menu].price = Number(row.price) || 0;
  });
  Object.keys(summary).forEach(menu => {
    if (summary[menu].qty <= 0) delete summary[menu];
  });
  return summary;
}
async function fetchOrderHistory() {
  const tableNum = getTableNumber();
  if (!tableNum) return;
  const url = `${scriptURL}?table=${tableNum}`;
  const res = await fetch(url);
  const data = await res.json();
  const summary = getUnpaidOrderSummary(data, tableNum);

  let html = "";
  if (Object.keys(summary).length === 0) {
    html = "<div style='color:#bbb'>ยังไม่มีออเดอร์</div>";
  } else {
    for (const [name, item] of Object.entries(summary)) {
      html += `<div>${name} <b>x${item.qty}</b> <span style="color:#2362aa;">${item.price * item.qty} ฿</span></div>`;
    }
    html += `<div style="text-align:right;margin-top:5px;color:#1566a4;font-weight:bold;">รวม ${Object.values(summary).reduce((sum, i) => sum + i.price * i.qty, 0)} ฿</div>`;
  }
  document.getElementById('order-history').innerHTML = html;
}

// ==== INIT ====
renderMenuList();
renderCart();
fetchOrderHistory();
window.addEventListener("focus", fetchOrderHistory);
