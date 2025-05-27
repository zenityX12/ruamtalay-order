// js/app.js

// ==== CONFIG ====
const MENUS     = window.MENU_GROUPS;  
const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6";

// ==== CART STATE ====
let cart = {};

// ==== TABLE HELPER ====
function getTableNumber() {
  const url = new URL(window.location.href);
  let t = url.searchParams.get('table') || url.hash.replace('#','');
  document.getElementById('table-number').textContent = t ? `โต๊ะ ${t}` : '';
  return t;
}

// ==== MENU RENDER ====
function renderMenuList() {
  document.getElementById('menu-list').innerHTML =
    MENUS.map(group => {
      const items = group.items.map(item => `
        <div class="menu-item">
          <span class="item-name">${item.name}</span>
          <span class="item-price">${item.price} ฿</span>
          <button class="add-btn" onclick="addToCart('${item.name.replace(/'/g,"\\'")}',${item.price})">+</button>
        </div>`).join('');
      return `<div class="section">
                <div class="section-title">${group.group}</div>
                ${items}
              </div>`;
    }).join('');
}

// ==== CART RENDER & CONTROL ====
function renderCart() {
  let total = 0, count = 0;
  const rows = Object.entries(cart)
    .filter(([_,i]) => i.qty > 0)
    .map(([name,i]) => {
      total += i.qty * i.price;
      count += i.qty;
      return `
        <div class="cart-row">
          <span class="cart-name">${name}</span>
          <span class="cart-price">${i.qty*i.price} ฿</span>
          <input type="number" min="1" max="99" value="${i.qty}"
                 onchange="setQty('${name.replace(/'/g,"\\'")}',this.value)">
          <button class="cart-remove" onclick="removeFromCart('${name.replace(/'/g,"\\'")}')">ลบ</button>
        </div>`;
    }).join('');

  document.getElementById('cart').innerHTML = 
    rows + `<div id="total">รวม ${total} ฿</div>` 
    || "<div style='color:#bbb'>ยังไม่มีสินค้าในตะกร้า</div>";

  document.getElementById('cart-count').textContent = count || '';
  document.getElementById('order-btn').disabled = count === 0;
}

window.addToCart = (name,price) => {
  if (!cart[name]) cart[name] = { qty: 0, price };
  cart[name].qty += 1;
  renderCart();
  shakeCart();
};

window.setQty = (name,val) => {
  cart[name].qty = Math.max(1,Math.min(99,Number(val)));
  renderCart();
};

window.removeFromCart = name => {
  if (cart[name]) {
    cart[name].qty -= 1;
    if (cart[name].qty <= 0) delete cart[name];
    renderCart();
  }
};

window.scrollToCart = () =>
  document.getElementById('cart').scrollIntoView({ behavior:'smooth' });

// shake animation
function shakeCart(){
  const el = document.getElementById('cart-icon-box');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'),400);
}

// ==== PLACE ORDER ====
document.getElementById('order-btn').onclick = async () => {
  const table = getTableNumber();
  if (!table) return alert('ไม่พบหมายเลขโต๊ะ');
  const note = document.getElementById('note').value;
  document.getElementById('order-btn').disabled = true;
  document.getElementById('thankyou').classList.remove('hide');

  const now = new Date().toISOString();
  for (const [name,item] of Object.entries(cart)) {
    for (let i=0; i<item.qty; i++) {
      await fetch(scriptURL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          table: table,
          menu: name,
          price: item.price,
          qty: 1,
          note: note,
          timestamp: now
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

// ==== HISTORY (Net Qty Only) ====
function getNetOrderSummary(data,table) {
  const sum = {};
  data.forEach(r => {
    if (String(r.table).trim() !== String(table) || !r.menu) return;
    const q = Number(r.qty||1);
    if (!sum[r.menu]) sum[r.menu] = { qty: 0, price: 0 };
    sum[r.menu].qty += q;
    if (Number(r.price)>0) sum[r.menu].price = Number(r.price);
  });
  Object.keys(sum).forEach(m => { if (sum[m].qty<=0) delete sum[m]; });
  return sum;
}

async function fetchOrderHistory(){
  const table = getTableNumber();
  if (!table) return;
  const data = await (await fetch(`${scriptURL}?table=${table}`)).json();
  const summary = getNetOrderSummary(data,table);

  let html = '';
  if (!Object.keys(summary).length) {
    html = "<div style='color:#bbb'>ยังไม่มีออเดอร์</div>";
  } else {
    for (const [m,i] of Object.entries(summary)) {
      html += `<div>${m} <b>x${i.qty}</b> 
                <span style="color:#2362aa;">${i.qty*i.price} ฿</span>
              </div>`;
    }
    const total = Object.values(summary)
      .reduce((s,i) => s + i.qty*i.price,0);
    html += `<div style="text-align:right;margin-top:5px;
               font-weight:bold;color:#1562a4;">
               รวม ${total} ฿
             </div>`;
  }

  document.getElementById('order-history').innerHTML = html;
}

// ==== INIT ====
renderMenuList();
renderCart();
fetchOrderHistory();
window.addEventListener("focus", fetchOrderHistory);
