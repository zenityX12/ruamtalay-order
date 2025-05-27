// js/kitchen.js

const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6";

let orderRaw = [];

// โหลดออเดอร์แล้วแสดงผล
async function loadKitchen() {
  const container = document.getElementById('kitchen-orders');
  container.innerHTML = "⏳ กำลังโหลดออเดอร์...";
  const res = await fetch(scriptURL);
  orderRaw = await res.json();

  // สร้าง net qty per table per menu
  const netByTable = {};
  orderRaw.forEach(r => {
    const t = String(r.table).trim();
    const m = r.menu;
    const q = Number(r.qty || 0);
    if (!t || !m) return;
    netByTable[t] = netByTable[t] || {};
    netByTable[t][m] = (netByTable[t][m] || 0) + q;
  });

  // สร้างการ์ดแต่ละโต๊ะที่มีรายการ
  let html = '';
  Object.keys(netByTable)
    .sort((a,b)=>Number(a)-Number(b))
    .forEach(table => {
      // กรองเมนูที่ qty>0
      const items = Object.entries(netByTable[table])
        .filter(([,qty])=>qty>0)
        .map(([menu,qty])=>({ menu, qty }));
      if (!items.length) return;
      html += `<div class="table-card">
        <div class="table-header">โต๊ะ ${table}</div>
        <ul class="order-list">`;
      items.forEach(o => {
        html += `<li>
          <span class="menu-name">${o.menu}</span>
          <span class="menu-qty">${o.qty}</span>
        </li>`;
      });
      html += `</ul></div>`;
    });

  container.innerHTML = html || "<div style='color:#666; text-align:center;'>ไม่มีออเดอร์ค้าง</div>";
}

// เรียกครั้งแรก
loadKitchen();
