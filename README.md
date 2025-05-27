# ruamtalay-order

# คู่มือการใช้งานโปรเจกต์ Ruamtalay-Order

## สรุปโครงสร้าง

```
/ (root)
├─ index.html         # หน้า Order ลูกค้า
├─ admin.html         # หน้า Admin
├─ kitchen.html       # หน้า ครัว
├─ style.css          # สไตล์หลักสำหรับทุกหน้า
└─ js/
   ├─ menu.js         # ข้อมูลเมนู (window.MENU_GROUPS)
   ├─ app.js          # โลจิกหน้า Order ลูกค้า
   ├─ admin.js        # โลจิกหน้า Admin
   └─ kitchen.js      # โลจิกหน้า ครัว
```

---

## 📝 คู่มือภาษาไทย

### 1. หน้า Order (ลูกค้า)

* **URL**: `https://<username>.github.io/<repo>/?table=<หมายเลขโต๊ะ>`
* **การใช้งาน**:

  1. ลูกค้าเปิดด้วยมือถือ/แท็บเล็ตหรือ PC
  2. กดปุ่ม `+` เพื่อเพิ่มเมนูลงในตะกร้า
  3. ปรับจำนวนหรือกด `ลบ` ในตะกร้าได้
  4. พิมพ์หมายเหตุ (ถ้ามี) → กด `ส่งออเดอร์`
  5. รอสถานะ `ขอบคุณที่สั่งอาหาร...` แล้วระบบจะเคลียร์ตะกร้า
  6. ดูรายการที่สั่งไปแล้ว (สรุปยอดปัจจุบัน)

### 2. หน้า Admin

* **URL**: `https://<username>.github.io/<repo>/admin.html`
* **การใช้งาน**:

  1. เลือกโต๊ะจาก dropdown → กดรีเฟรช (ถ้าต้องการ)
  2. ดูตารางรายการเมนูที่ยัง unpaid (net qty > 0)
  3. เปลี่ยนจำนวนหรือกด `ลบ` เพื่อแก้ไข order
  4. กด `เช็คบิล` เมื่อต้องการปิดโต๊ะ (soft delete ทุกรายการ)
  5. ปุ่ม `➡ ไปหน้าออเดอร์ลูกค้า` สำหรับเพิ่ม order แทนลูกค้าได้

### 3. หน้า Kitchen (ครัว)

* **URL**: `https://<username>.github.io/<repo>/kitchen.html`
* **การใช้งาน**:

  1. กด `รีเฟรชออเดอร์` เพื่อโหลดคำสั่งใหม่
  2. ดูการ์ดแยกตามโต๊ะ พร้อมรายการเมนูและจำนวน
  3. แตะที่รายการ (li) เพื่อเปลี่ยนเป็นสีเขียว = เสร็จแล้ว
  4. แตะอีกครั้งเพื่อคืนสถานะ (ป้องกันกดพลาด)

### 4. การปรับแต่งเมนู

* แก้ไฟล์ `js/menu.js`:

  ```js
  window.MENU_GROUPS = [
    { group: "ข้าวต้ม", items: [ { name: "ข้าวต้มปลา", price: 59 }, ... ] },
    ...
  ];
  ```
* บันทึกแล้ว commit → push → reload หน้าเว็บ

### 5. การตั้งค่าคอลัมน์ Google Sheet

| ชื่อคอลัมน์ | คำอธิบาย                       |
| ----------- | ------------------------------ |
| `table`     | หมายเลขโต๊ะ                    |
| `menu`      | ชื่อเมนู                       |
| `price`     | ราคาต่อหน่วย (฿)               |
| `qty`       | จำนวน (+/-)                    |
| `note`      | หมายเหตุ (paid, แอดมินลบ, ฯลฯ) |
| `timestamp` | เวลาสั่ง/แก้ไข                 |

---

## 📄 English Guide

### Project Structure

```
/ (root)
├─ index.html         # Customer Order page
├─ admin.html         # Admin dashboard
├─ kitchen.html       # Kitchen view
├─ style.css          # Global stylesheet
└─ js/
   ├─ menu.js         # Menu data (window.MENU_GROUPS)
   ├─ app.js          # Customer logic
   ├─ admin.js        # Admin logic
   └─ kitchen.js      # Kitchen logic
```


### 📘 Usage

#### 1. Customer Order Page

**URL:** `https://<username>.github.io/<repo>/?table=<tableNumber>`

1. Click `+` to add items to cart.
2. Edit qty or remove from cart.
3. Optional note → click **Send Order**.
4. Wait for confirmation and cart resets.
5. View current order summary below.

#### 2. Admin Dashboard

**URL:** `https://<username>.github.io/<repo>/admin.html`

1. Select table → Refresh.
2. Edit qty or **Delete** items.
3. Click **Checkout** to close the table.
4. Use **➡ Customer Order** link to open customer page.

#### 3. Kitchen View

**URL:** `https://<username>.github.io/<repo>/kitchen.html`

1. Click **Refresh Orders**.
2. View table cards with items & quantities.
3. Tap an item to mark **Done** (green).
4. Tap again to reset.

### 📋 Menu Configuration

Edit `js/menu.js`:

```js
window.MENU_GROUPS = [
  { group: "Porridge", items: [ { name: "Fish Porridge", price: 59 }, ... ] },
  ...
];
```

Commit & push → site reloads.

### 🗒️ Google Sheet Columns

| Column      | Description                         |
| ----------- | ----------------------------------- |
| `table`     | Table number                        |
| `menu`      | Menu name                           |
| `price`     | Unit price (THB)                    |
| `qty`       | Quantity (+/-)                      |
| `note`      | Notes (`paid`, admin deletes, etc.) |
| `timestamp` | Order/edit timestamp                |

---

Thank you for using Ruamtalay-Order! For issues or feature requests, please open an issue on GitHub.
