// js/admin.js

const scriptURL = "https://api.sheetbest.com/sheets/67a68e64-dca9-4eea-99b7-0431c5786cf6";
let orderRaw = [];

// โหลดข้อมูลออเดอร์ทั้งหมด + สร้าง dropdown โต๊ะ
async function loadAdminOrders() {
  document.getElementById('admin-result').textContent = "⏳ กำลังโหลด...";
  document.getElementById('admin-orders').innerHTML = "";
  const res = await fetch(scriptURL);
  orderRaw = await res.json();

  // รวม net qty per menu per table
  const tableMap = {};
  const netByTable = {};
  orderRaw.forEach(r => {
    const t = String(r.table).trim(),
          m = r.menu,
          q = Number(r.qty || 0);
    if(!t||!m) return;
    netByTable[t] = netByTable[t] || {};
    netByTable[t][m] = (netByTable[t][m] || 0) + q;
  });
  Object.entries(netByTable).forEach(([t,menus])=>{
    if(Object.values(menus).some(x=>x>0)) tableMap[t]=true;
  });

  // สร้างตัวเลือกโต๊ะ
  const tables = Object.keys(tableMap).sort((a,b)=>a-b);
  const sel = document.getElementById('select-table');
  sel.innerHTML = tables.map(t=>`<option value="${t}">โต๊ะ ${t}</option>`).join('');
  if(!tables.length) {
    document.getElementById('admin-result').textContent = "🎉 ไม่มีออเดอร์ค้าง";
    return;
  }
  sel.value = tables[0];
  renderOrderTable(tables[0]);
}

// แสดงตารางออเดอร์ net qty ของโต๊ะที่เลือก
function renderOrderTable(table) {
  // รวม net qty & last price & note
  const net = {}, priceMap = {}, noteMap = {};
  orderRaw.forEach(r=>{
    if(String(r.table).trim()!==String(table)||!r.menu) return;
    const m=r.menu, q=Number(r.qty||0), p=Number(r.price)||0;
    net[m] = (net[m]||0) + q;
    if(p>0) priceMap[m]=p;
    if(r.note) noteMap[m]=r.note;
  });
  // กรองเมนูที่ qty>0
  const menus = Object.entries(net)
    .filter(([_,q])=>q>0)
    .map(([m,q])=>({menu:m,qty:q,price:priceMap[m]||0,note:noteMap[m]||''}));

  if(!menus.length){
    document.getElementById('admin-orders').innerHTML =
      "<div style='color:#bbb'>ไม่มีออเดอร์ในโต๊ะนี้</div>";
    return;
  }

  // สร้าง HTML ตาราง
  let sum=0, html = `<table class="order-table">
    <tr><th>เมนู</th><th>จำนวน</th><th>ราคา</th><th>หมายเหตุ</th><th>ลบ</th></tr>`;
  menus.forEach(o=>{
    sum += o.qty*o.price;
    html += `<tr>
      <td>${o.menu}</td>
      <td>
        <input class="input-qty" type="number" min="1" max="99"
               value="${o.qty}"
               onchange="adminUpdateQty('${table}','${o.menu.replace(/'/g,"\\'")}',this.value)">
      </td>
      <td>${o.qty*o.price} ฿</td>
      <td>${o.note}</td>
      <td>
        <button class="order-action-btn delete-btn"
                onclick="adminDeleteOrder('${table}','${o.menu.replace(/'/g,"\\'")}')">
          ลบ
        </button>
      </td>
    </tr>`;
  });
  html += `<tr>
      <td colspan="2" style="text-align:right;font-weight:bold">รวม</td>
      <td style="font-weight:bold">${sum} ฿</td>
      <td colspan="2"></td>
    </tr>
  </table>`;
  html += `<button class="order-action-btn checkout-btn" onclick="adminCheckout('${table}')">
             เช็คบิล
           </button>`;

  document.getElementById('admin-orders').innerHTML = html;
}

// หาราคาเดิมล่าสุด (fallback)
function getLastPrice(table,menu){
  for(let i=orderRaw.length-1;i>=0;i--){
    const r=orderRaw[i];
    if(String(r.table).trim()===String(table)
      &&r.menu===menu
      &&Number(r.price)>0) return Number(r.price);
  }
  return 0;
}

// ลบเมนู (soft delete)
window.adminDeleteOrder = async function(table,menu){
  if(!confirm(`ลบ "${menu}" โต๊ะ ${table}?`)) return;
  const now = new Date().toISOString();
  // หา net qty & price
  let qty=0, price=0;
  orderRaw.forEach(r=>{
    if(String(r.table).trim()===String(table)&&r.menu===menu){
      qty += Number(r.qty||0);
      if(Number(r.price)>0) price = Number(r.price);
    }
  });
  price = price || getLastPrice(table,menu);
  if(qty<=0) return;
  await fetch(scriptURL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({table,menu,price,qty:-qty,note:"ลบโดยแอดมิน",timestamp:now})
  });
  setTimeout(()=>loadAdminOrders(),800);
};

// แก้จำนวน
window.adminUpdateQty = async function(table,menu,newQty){
  newQty = Math.max(1,Math.min(99,Number(newQty)));
  // คำนวณ diff
  let oldQty=0, price=0;
  orderRaw.forEach(r=>{
    if(String(r.table).trim()===String(table)&&r.menu===menu){
      oldQty += Number(r.qty||0);
      if(Number(r.price)>0) price = Number(r.price);
    }
  });
  price = price || getLastPrice(table,menu);
  const diff = newQty - oldQty;
  if(diff===0) return;
  const now = new Date().toISOString();
  await fetch(scriptURL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({table,menu,price,qty:diff,note:"แก้ไขจำนวน",timestamp:now})
  });
  setTimeout(()=>loadAdminOrders(),800);
};

// เช็คบิล (soft delete ทุกเมนู)
window.adminCheckout = async function(table){
  if(!confirm(`เช็คบิล โต๊ะ ${table}?`)) return;
  const now = new Date().toISOString();
  // รวม net ทุกเมนู
  const net = {};
  orderRaw.forEach(r=>{
    if(String(r.table).trim()===String(table)&&r.menu){
      net[r.menu] = (net[r.menu]||0) + Number(r.qty||0);
    }
  });
  for(const [menu,qty] of Object.entries(net)){
    if(qty>0){
      const price = getLastPrice(table,menu);
      // soft delete
      await fetch(scriptURL,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({table,menu,price,qty:-qty,note:"paid",timestamp:now})
      });
    }
  }
  document.getElementById('admin-result').textContent = "✅ เช็คบิลเรียบร้อย";
  setTimeout(()=>document.getElementById('admin-result').textContent='',2000);
  setTimeout(()=>loadAdminOrders(),800);
};

// เริ่มต้น
loadAdminOrders();
