"use strict";

const STORAGE_KEY = "mixmatch-pos-demo-v2";
const CATEGORIES = ["Tops", "Shirts", "Trousers", "Dresses", "Jackets", "Skirts", "Accessories"];
const VIEW_TITLES = {
  dashboard: "Overview",
  products: "Products & inventory",
  pos: "Checkout",
  orders: "Sales history",
};

const $ = (id) => document.getElementById(id);
const money = (value) => `IDR ${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
const quantityLabel = (value) => `${value} ${value === 1 ? "item" : "items"}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function makeSeedProducts() {
  return [
    { id: "p-shi-018", code: "SHI-018", name: "Cloudline Shirt", category: "Shirts", brand: "Rove Atelier", color: "Ivory", size: "M", stock: 8, minStock: 5, costPrice: 92000, price: 189000 },
    { id: "p-drs-024", code: "DRS-024", name: "Afterglow Dress", category: "Dresses", brand: "Solace Studio", color: "Terracotta", size: "L", stock: 6, minStock: 4, costPrice: 145000, price: 289000 },
    { id: "p-trs-032", code: "TRS-032", name: "Woodland Trousers", category: "Trousers", brand: "Field & Form", color: "Charcoal", size: "30", stock: 3, minStock: 5, costPrice: 107000, price: 229000 },
    { id: "p-jkt-081", code: "JKT-081", name: "Evening Jacket", category: "Jackets", brand: "Rove Atelier", color: "Brown", size: "L", stock: 12, minStock: 4, costPrice: 174000, price: 329000 },
    { id: "p-skt-052", code: "SKT-052", name: "Moonrise Skirt", category: "Skirts", brand: "Solace Studio", color: "Plum", size: "S", stock: 7, minStock: 3, costPrice: 87000, price: 199000 },
    { id: "p-acc-011", code: "ACC-011", name: "Coral Scarf", category: "Accessories", brand: "Field & Form", color: "Coral", size: "One size", stock: 19, minStock: 6, costPrice: 32000, price: 79000 },
    { id: "p-shi-033", code: "SHI-033", name: "Olive Shirt", category: "Shirts", brand: "Daybreak Studio", color: "Olive", size: "XL", stock: 4, minStock: 5, costPrice: 93000, price: 215000 },
    { id: "p-drs-040", code: "DRS-040", name: "Rainflower Dress", category: "Dresses", brand: "Daybreak Studio", color: "Mist blue", size: "M", stock: 2, minStock: 4, costPrice: 162000, price: 349000 },
  ];
}

function localDateDaysAgo(days, hour = 12, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function makeSeedState() {
  const products = makeSeedProducts();
  const productById = (id) => products.find((product) => product.id === id);
  const sampleOrder = (receiptNumber, daysAgo, hour, customer, paymentMethod, rows, discountPercent = 0) => ({
    id: `seed-${receiptNumber.toLowerCase()}`,
    receiptNumber,
    date: localDateDaysAgo(daysAgo, hour),
    customer,
    paymentMethod,
    status: "Completed",
    discountPercent,
    items: rows.map(([productId, quantity]) => {
      const product = productById(productId);
      return {
        productId,
        productCode: product.code,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        costPrice: product.costPrice,
      };
    }),
  });

  return {
    version: 2,
    nextReceiptNumber: 5,
    products,
    orders: [
      sampleOrder("DEMO-0004", 0, 10, "Drew Demo", "Cash (simulation)", [["p-shi-033", 1], ["p-drs-040", 1]], 5),
      sampleOrder("DEMO-0003", 1, 15, "Casey Demo", "Non-cash (simulation)", [["p-trs-032", 1], ["p-acc-011", 2]]),
      sampleOrder("DEMO-0002", 3, 12, "Blake Demo", "Cash (simulation)", [["p-drs-024", 1], ["p-skt-052", 1]], 10),
      sampleOrder("DEMO-0001", 5, 9, "Avery Demo", "Cash (simulation)", [["p-shi-018", 1], ["p-acc-011", 1]]),
    ],
    cart: [],
    discountPercent: 0,
    paymentMethod: "Cash (simulation)",
  };
}

function isValidState(value) {
  return Boolean(value && value.version === 2 && Array.isArray(value.products) && Array.isArray(value.orders) && Array.isArray(value.cart));
}

function loadInitialState() {
  let loaded = makeSeedState();
  let storageReady = true;
  try {
    const probeKey = `${STORAGE_KEY}-probe`;
    window.localStorage.setItem(probeKey, "ok");
    window.localStorage.removeItem(probeKey);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (isValidState(parsed)) loaded = parsed;
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    }
  } catch {
    storageReady = false;
  }
  return { state: loaded, storageReady };
}

const initial = loadInitialState();
let state = initial.state;
let storageReady = initial.storageReady;
let toastTimer;

function updateSaveStatus() {
  const node = $("saveStatus");
  if (!node) return;
  node.classList.toggle("is-error", !storageReady);
  node.innerHTML = storageReady
    ? '<span class="status-dot" aria-hidden="true"></span> Saved in this browser'
    : '<span class="status-dot" aria-hidden="true"></span> Browser storage unavailable';
}

function commit(update, successMessage) {
  if (!storageReady) {
    showToast("Local storage is unavailable. Open the demo through a local server and allow site storage in your browser.", true);
    return false;
  }
  const nextState = JSON.parse(JSON.stringify(state));
  let replacement;
  try {
    replacement = update(nextState) || nextState;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(replacement));
  } catch {
    storageReady = false;
    updateSaveStatus();
    showToast("Your browser could not save this change. No data was changed.", true);
    return false;
  }
  state = replacement;
  updateSaveStatus();
  renderAll();
  if (successMessage) showToast(successMessage);
  return true;
}

function showToast(message, isError = false) {
  const region = $("toastRegion");
  if (!region) return;
  region.replaceChildren();
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " is-error" : ""}`;
  toast.textContent = message;
  region.append(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 3600);
}

function getProduct(productId, source = state) {
  return source.products.find((product) => product.id === productId);
}

function subtotal(items) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function totalFor(items, discountPercent = 0) {
  const base = subtotal(items);
  const discount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  return Math.max(0, Math.round(base - (base * discount) / 100));
}

function profitFor(order) {
  const grossProfit = order.items.reduce((total, item) => total + (item.unitPrice - item.costPrice) * item.quantity, 0);
  const discount = subtotal(order.items) - totalFor(order.items, order.discountPercent);
  return grossProfit - discount;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function fillCategoryOptions() {
  const options = CATEGORIES.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  ["categoryFilter", "posCategoryFilter"].forEach((id) => $(id).insertAdjacentHTML("beforeend", options));
  $("productCategoryInput").innerHTML = options;
}

function renderMetrics() {
  const revenue = state.orders.reduce((sum, order) => sum + totalFor(order.items, order.discountPercent), 0);
  const profit = state.orders.reduce((sum, order) => sum + profitFor(order), 0);
  const stockUnits = state.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const metrics = [
    { label: "Demo sales", value: money(revenue), note: "Sample receipts and activity in this session", icon: "↗" },
    { label: "Demo gross profit", value: money(profit), note: "Estimated from fictional cost prices", icon: "◈" },
    { label: "Active products", value: state.products.length.toLocaleString("en-US"), note: "In the local demo catalog", icon: "▦" },
    { label: "Units in stock", value: stockUnits.toLocaleString("en-US"), note: `${state.orders.length.toLocaleString("en-US")} demo sales saved`, icon: "◷" },
  ];
  $("metricGrid").innerHTML = metrics.map((metric) => `
    <article class="metric-card">
      <div class="metric-top"><span>${escapeHtml(metric.label)}</span><span class="metric-icon" aria-hidden="true">${metric.icon}</span></div>
      <div class="metric-value">${escapeHtml(metric.value)}</div>
      <div class="metric-foot">${escapeHtml(metric.note)}</div>
    </article>`).join("");
}

function renderChart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const amount = state.orders
      .filter((order) => {
        const orderDate = new Date(order.date);
        return `${orderDate.getFullYear()}-${orderDate.getMonth()}-${orderDate.getDate()}` === key;
      })
      .reduce((sum, order) => sum + totalFor(order.items, order.discountPercent), 0);
    days.push({ date, amount });
  }
  const peak = Math.max(1, ...days.map((day) => day.amount));
  $("salesChart").setAttribute("aria-label", `Seven-day sales chart; highest sales are ${money(peak)}.`);
  $("salesChart").innerHTML = days.map(({ date, amount }) => {
    const barHeight = amount ? Math.max(5, Math.round((amount / peak) * 100)) : 0;
    return `<div class="chart-day" title="${escapeHtml(date.toLocaleDateString("en-US"))}: ${escapeHtml(money(amount))}">
      <span class="bar-value">${amount ? escapeHtml(money(amount)) : ""}</span>
      <div class="bar-track"><div class="bar-fill" style="height:${barHeight}%"></div></div>
      <span class="chart-label">${escapeHtml(formatDay(date))} ${date.getDate()}</span>
    </div>`;
  }).join("");
}

function renderLowStock() {
  const lowStock = state.products.filter((product) => Number(product.stock) <= Number(product.minStock)).sort((a, b) => a.stock - b.stock);
  $("lowStockCount").textContent = lowStock.length.toLocaleString("en-US");
  $("lowStockList").innerHTML = lowStock.length
    ? lowStock.slice(0, 4).map((product) => `<div class="stock-row">
        <div class="stock-product"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.code)} · min. ${Number(product.minStock)}</small></div>
        <span class="stock-qty">${Number(product.stock)} left</span>
      </div>`).join("")
    : '<div class="empty-note">All products are above their minimum stock levels.</div>';
}

function renderBestSellers() {
  const sales = new Map();
  state.orders.forEach((order) => order.items.forEach((item) => {
    const existing = sales.get(item.productId) || { productName: item.productName, productCode: item.productCode, quantity: 0, unitPrice: item.unitPrice };
    existing.quantity += Number(item.quantity);
    sales.set(item.productId, existing);
  }));
  const items = [...sales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  $("bestSellers").innerHTML = items.length
    ? items.map((item) => `<tr><td><div class="product-name-cell"><strong>${escapeHtml(item.productName)}</strong><small>${escapeHtml(item.productCode)}</small></div></td><td class="quantity-cell">${item.quantity}</td><td>${escapeHtml(money(item.unitPrice))}</td></tr>`).join("")
    : '<tr><td colspan="3"><div class="empty-note">No demo sales yet.</div></td></tr>';
}

function renderRecentOrders() {
  const recent = [...state.orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  $("recentOrders").innerHTML = recent.length
    ? recent.map((order) => `<div class="recent-order"><div class="recent-order-info"><strong>${escapeHtml(order.receiptNumber)}</strong><small>${escapeHtml(order.customer)} · ${escapeHtml(formatDate(order.date))}</small></div><span class="recent-order-total">${escapeHtml(money(totalFor(order.items, order.discountPercent)))}</span></div>`).join("")
    : '<div class="empty-note">No sales in this session yet.</div>';
}

function renderProducts() {
  const search = $("productSearch").value.trim().toLocaleLowerCase("en-US");
  const category = $("categoryFilter").value;
  const products = state.products.filter((product) => {
    const matchesSearch = `${product.name} ${product.code} ${product.brand}`.toLocaleLowerCase("en-US").includes(search);
    return matchesSearch && (!category || product.category === category);
  }).sort((a, b) => a.code.localeCompare(b.code, "en-US"));
  $("productCount").textContent = `${products.length} products`;
  $("productsTable").innerHTML = products.length
    ? products.map((product) => {
      const low = Number(product.stock) <= Number(product.minStock);
      return `<tr>
        <td><div class="product-name-cell"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.code)} · ${escapeHtml(product.brand || "Demo brand")}</small></div></td>
        <td>${escapeHtml(product.category)}</td>
        <td class="variant-text">${escapeHtml(product.color || "—")} · ${escapeHtml(product.size || "—")}</td>
        <td><span class="stock-badge${low ? " is-low" : ""}">${Number(product.stock)} in stock${low ? " · low" : ""}</span></td>
        <td>${escapeHtml(money(product.price))}</td>
        <td><div class="action-group">
          <button class="mini-button" type="button" data-action="decrease-stock" data-product-id="${escapeHtml(product.id)}" aria-label="Decrease ${escapeHtml(product.name)} stock">−</button>
          <button class="mini-button" type="button" data-action="increase-stock" data-product-id="${escapeHtml(product.id)}" aria-label="Increase ${escapeHtml(product.name)} stock">+</button>
          <button class="mini-button" type="button" data-action="edit-product" data-product-id="${escapeHtml(product.id)}">Edit</button>
          <button class="mini-button is-danger" type="button" data-action="delete-product" data-product-id="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(product.name)}">Delete</button>
        </div></td>
      </tr>`;
    }).join("")
    : '<tr><td colspan="6"><div class="empty-note">No products found. Try another search or filter.</div></td></tr>';
}

function renderPosProducts() {
  const search = $("posSearch").value.trim().toLocaleLowerCase("en-US");
  const category = $("posCategoryFilter").value;
  const products = state.products.filter((product) => `${product.name} ${product.code}`.toLocaleLowerCase("en-US").includes(search) && (!category || product.category === category));
  $("posProducts").innerHTML = products.length
    ? products.map((product) => `<article class="pos-product">
        <div class="pos-product-info"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.code)} · ${Number(product.stock)} in stock</small><span>${escapeHtml(money(product.price))}</span></div>
        ${Number(product.stock) > 0
          ? `<button class="add-to-cart" type="button" data-action="add-to-cart" data-product-id="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.name)} to cart">+</button>`
          : '<span class="sold-out">Out of stock</span>'}
      </article>`).join("")
    : '<div class="empty-note">No products match this search.</div>';
}

function cartItemCount() {
  return state.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
}

function renderCart() {
  const lines = state.cart.filter((line) => getProduct(line.productId));
  $("cartItemCount").textContent = quantityLabel(cartItemCount());
  $("cartLines").innerHTML = lines.length
    ? lines.map((line) => {
      const product = getProduct(line.productId);
      return `<div class="cart-line">
        <div class="cart-line-main"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.code)} · ${escapeHtml(money(product.price))} / unit</small></div>
        <span class="cart-line-total">${escapeHtml(money(product.price * line.quantity))}</span>
        <div class="cart-line-controls">
          <button class="cart-qty-button" type="button" data-action="decrease-cart" data-product-id="${escapeHtml(product.id)}" aria-label="Decrease ${escapeHtml(product.name)} quantity">−</button>
          <span class="cart-qty">${Number(line.quantity)}</span>
          <button class="cart-qty-button" type="button" data-action="increase-cart" data-product-id="${escapeHtml(product.id)}" aria-label="Increase ${escapeHtml(product.name)} quantity" ${line.quantity >= product.stock ? "disabled" : ""}>+</button>
          <button class="remove-cart-line" type="button" data-action="remove-cart" data-product-id="${escapeHtml(product.id)}">Remove</button>
        </div>
      </div>`;
    }).join("")
    : '<div class="cart-empty">Your cart is empty.<br />Choose a product to start a demo sale.</div>';
  const base = lines.reduce((sum, line) => sum + getProduct(line.productId).price * line.quantity, 0);
  $("cartSubtotal").textContent = money(base);
  $("cartTotal").textContent = money(totalFor(lines.map((line) => ({ unitPrice: getProduct(line.productId).price, quantity: line.quantity })), state.discountPercent));
  $("discountInput").value = String(state.discountPercent || 0);
  $("paymentMethod").value = state.paymentMethod || "Cash (simulation)";
  $("checkoutButton").disabled = lines.length === 0;
  $("clearCartButton").disabled = lines.length === 0;
}

function renderOrders() {
  const search = $("orderSearch").value.trim().toLocaleLowerCase("en-US");
  const orders = [...state.orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((order) => `${order.receiptNumber} ${order.customer}`.toLocaleLowerCase("en-US").includes(search));
  $("orderCount").textContent = `${state.orders.length} sales`;
  $("ordersTable").innerHTML = orders.length
    ? orders.map((order) => `<tr>
        <td><span class="receipt-code">${escapeHtml(order.receiptNumber)}</span><br /><span class="order-status">${escapeHtml(order.status)} · demo</span></td>
        <td class="order-date">${escapeHtml(formatDate(order.date))}</td>
        <td class="order-customer">${escapeHtml(order.customer)}</td>
        <td>${quantityLabel(order.items.reduce((count, item) => count + Number(item.quantity), 0))}</td>
        <td>${escapeHtml(order.paymentMethod)}</td>
        <td class="align-right"><strong>${escapeHtml(money(totalFor(order.items, order.discountPercent)))}</strong></td>
      </tr>`).join("")
    : '<tr><td colspan="6"><div class="empty-note">No matching sales found.</div></td></tr>';
}

function renderAll() {
  updateSaveStatus();
  renderMetrics();
  renderChart();
  renderLowStock();
  renderBestSellers();
  renderRecentOrders();
  renderProducts();
  renderPosProducts();
  renderCart();
  renderOrders();
}

function navigate(view) {
  if (!VIEW_TITLES[view]) return;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const isActive = panel.dataset.viewPanel === view;
    panel.hidden = !isActive;
    panel.classList.toggle("is-visible", isActive);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("pageTitle").textContent = VIEW_TITLES[view];
  $("sidebar").classList.remove("is-open");
  $("menuButton").setAttribute("aria-expanded", "false");
}

function openProductDialog(product = null) {
  $("productForm").reset();
  $("productFormError").hidden = true;
  $("productFormError").textContent = "";
  $("productIdInput").value = product?.id || "";
  $("productCodeInput").value = product?.code || "";
  $("productNameInput").value = product?.name || "";
  $("productCategoryInput").value = product?.category || CATEGORIES[0];
  $("productBrandInput").value = product?.brand || "";
  $("productColorInput").value = product?.color || "";
  $("productSizeInput").value = product?.size || "";
  $("productStockInput").value = String(product?.stock ?? 5);
  $("productMinStockInput").value = String(product?.minStock ?? 3);
  $("productCostInput").value = String(product?.costPrice ?? 50000);
  $("productPriceInput").value = String(product?.price ?? 90000);
  $("productDialogTitle").textContent = product ? "Edit demo product" : "Add product";
  $("productDialog").showModal();
}

function getFormProduct() {
  return {
    id: $("productIdInput").value || `p-${Date.now().toString(36)}`,
    code: $("productCodeInput").value.trim().toLocaleUpperCase("en-US"),
    name: $("productNameInput").value.trim(),
    category: $("productCategoryInput").value,
    brand: $("productBrandInput").value.trim(),
    color: $("productColorInput").value.trim(),
    size: $("productSizeInput").value.trim(),
    stock: Number($("productStockInput").value),
    minStock: Number($("productMinStockInput").value),
    costPrice: Number($("productCostInput").value),
    price: Number($("productPriceInput").value),
  };
}

function saveProduct(event) {
  event.preventDefault();
  const product = getFormProduct();
  const duplicate = state.products.some((item) => item.code.toLocaleUpperCase("en-US") === product.code && item.id !== product.id);
  if (duplicate) {
    $("productFormError").textContent = "That SKU is already in use. Choose a different demo SKU.";
    $("productFormError").hidden = false;
    return;
  }
  if (!product.code || !product.name || !CATEGORIES.includes(product.category) || !Number.isFinite(product.stock) || product.stock < 0 || !Number.isFinite(product.minStock) || product.minStock < 0 || !Number.isFinite(product.costPrice) || product.costPrice < 0 || !Number.isFinite(product.price) || product.price < 0) {
    $("productFormError").textContent = "Check the product name, category, stock, and prices.";
    $("productFormError").hidden = false;
    return;
  }
  const editing = Boolean($("productIdInput").value);
  const saved = commit((draft) => {
    if (editing) draft.products = draft.products.map((item) => item.id === product.id ? product : item);
    else draft.products.push(product);
  }, editing ? "Demo product updated." : "Demo product added to this browser.");
  if (saved) $("productDialog").close();
}

function handleProductAction(button) {
  const product = getProduct(button.dataset.productId);
  if (!product) return;
  const action = button.dataset.action;
  if (action === "increase-stock" || action === "decrease-stock") {
    const change = action === "increase-stock" ? 1 : -1;
    if (product.stock + change < 0) return;
    commit((draft) => {
      const target = getProduct(product.id, draft);
      target.stock += change;
    }, `${product.name} stock updated.`);
  } else if (action === "edit-product") {
    openProductDialog(product);
  } else if (action === "delete-product") {
    if (!window.confirm(`Remove ${product.name} from the demo catalog? Existing receipts will be kept.`)) return;
    commit((draft) => {
      draft.products = draft.products.filter((item) => item.id !== product.id);
      draft.cart = draft.cart.filter((item) => item.productId !== product.id);
    }, "Demo product removed from the catalog.");
  }
}

function addToCart(productId) {
  const product = getProduct(productId);
  if (!product || product.stock < 1) return;
  commit((draft) => {
    const existing = draft.cart.find((item) => item.productId === productId);
    if (existing) existing.quantity = Math.min(product.stock, existing.quantity + 1);
    else draft.cart.push({ productId, quantity: 1 });
  }, `${product.name} added to cart.`);
}

function handleCartAction(button) {
  const productId = button.dataset.productId;
  const action = button.dataset.action;
  const product = getProduct(productId);
  if (!product) return;
  if (action === "remove-cart") {
    commit((draft) => { draft.cart = draft.cart.filter((item) => item.productId !== productId); }, "Product removed from cart.");
    return;
  }
  commit((draft) => {
    const line = draft.cart.find((item) => item.productId === productId);
    if (!line) return;
    if (action === "increase-cart" && line.quantity < product.stock) line.quantity += 1;
    if (action === "decrease-cart") line.quantity -= 1;
    if (line.quantity < 1) draft.cart = draft.cart.filter((item) => item.productId !== productId);
  });
}

function checkout() {
  if (!state.cart.length) {
    showToast("Your cart is empty. Choose a demo product first.", true);
    return;
  }
  const orderItems = state.cart.map((line) => {
    const product = getProduct(line.productId);
    return product ? { productId: product.id, productCode: product.code, productName: product.name, quantity: line.quantity, unitPrice: product.price, costPrice: product.costPrice } : null;
  }).filter(Boolean);
  const insufficient = orderItems.find((item) => item.quantity > getProduct(item.productId).stock);
  if (insufficient) {
    showToast(`There is not enough stock for ${insufficient.productName}. Adjust the cart quantity.`, true);
    return;
  }
  if (totalFor(orderItems, state.discountPercent) <= 0) {
    showToast("The demo total must be greater than IDR 0.", true);
    return;
  }
  let receiptNumber;
  const saved = commit((draft) => {
    receiptNumber = `DEMO-${String(draft.nextReceiptNumber).padStart(4, "0")}`;
    draft.nextReceiptNumber += 1;
    draft.orders.unshift({
      id: `order-${Date.now().toString(36)}`,
      receiptNumber,
      date: new Date().toISOString(),
      customer: "Demo Customer",
      paymentMethod: draft.paymentMethod,
      status: "Completed",
      discountPercent: Math.min(100, Math.max(0, Number(draft.discountPercent) || 0)),
      items: orderItems,
    });
    draft.cart.forEach((line) => {
      const product = getProduct(line.productId, draft);
      if (product) product.stock -= line.quantity;
    });
    draft.cart = [];
    draft.discountPercent = 0;
    draft.paymentMethod = "Cash (simulation)";
  });
  if (saved) {
    showToast(`Sale ${receiptNumber} recorded as a demo in this browser.`);
    navigate("orders");
  }
}

function resetDemo() {
  if (!window.confirm("Reset the demo to its sample products and sales? Changes saved in this browser will be replaced.")) return;
  commit(() => makeSeedState(), "Demo reset to the sample data.");
  navigate("dashboard");
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  document.querySelectorAll("[data-go-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.goView)));
  $("menuButton").addEventListener("click", () => {
    const isOpen = $("sidebar").classList.toggle("is-open");
    $("menuButton").setAttribute("aria-expanded", String(isOpen));
  });
  $("resetButton").addEventListener("click", resetDemo);
  $("addProductButton").addEventListener("click", () => openProductDialog());
  $("closeDialogButton").addEventListener("click", () => $("productDialog").close());
  $("cancelDialogButton").addEventListener("click", () => $("productDialog").close());
  $("productForm").addEventListener("submit", saveProduct);
  $("productSearch").addEventListener("input", renderProducts);
  $("categoryFilter").addEventListener("change", renderProducts);
  $("posSearch").addEventListener("input", renderPosProducts);
  $("posCategoryFilter").addEventListener("change", renderPosProducts);
  $("orderSearch").addEventListener("input", renderOrders);
  $("productsTable").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) handleProductAction(button);
  });
  $("posProducts").addEventListener("click", (event) => {
    const button = event.target.closest('button[data-action="add-to-cart"]');
    if (button) addToCart(button.dataset.productId);
  });
  $("cartLines").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) handleCartAction(button);
  });
  $("discountInput").addEventListener("change", () => {
    const raw = Number($("discountInput").value);
    const discountPercent = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0));
    commit((draft) => { draft.discountPercent = discountPercent; });
  });
  $("paymentMethod").addEventListener("change", () => {
    const paymentMethod = $("paymentMethod").value;
    commit((draft) => { draft.paymentMethod = paymentMethod; });
  });
  $("clearCartButton").addEventListener("click", () => commit((draft) => {
    draft.cart = [];
    draft.discountPercent = 0;
  }, "Demo cart cleared."));
  $("checkoutButton").addEventListener("click", checkout);
  $("productDialog").addEventListener("click", (event) => {
    if (event.target === $("productDialog")) $("productDialog").close();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const updated = JSON.parse(event.newValue);
      if (isValidState(updated)) {
        state = updated;
        renderAll();
      }
    } catch {
      showToast("Demo data from another tab could not be read.", true);
    }
  });
}

fillCategoryOptions();
bindEvents();
renderAll();
