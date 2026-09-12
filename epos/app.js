const STORAGE_KEY = "smaxo_epos_sales_v1";
const CLOUD_SALES_KEY = "smaxo_epos_cloud_sales_v1";
// Set window.SMAXO_EPOS_API before app.js to use a real authenticated REST store.
// Empty by default: the same-origin async mock keeps the demo functional without exposing API keys.
const CLOUD_ENDPOINT = window.SMAXO_EPOS_API || "";
const PRICE_XAF = 500;
let paymentMethod = "Espèces";
const $ = (selector) => document.querySelector(selector);
const sellButton = $("#sellButton");
const ticket = $("#ticket");
const errorBox = $("#error");
const historyList = $("#historyList");
const saleCount = $("#saleCount");
const ticketCode = $("#ticketCode");
const ticketTime = $("#ticketTime");
const ticketPayment = $("#ticketPayment");

function readSales() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSales(sales) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

function readCloudSales() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUD_SALES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCloudSales(sales) {
  localStorage.setItem(CLOUD_SALES_KEY, JSON.stringify(sales));
  window.dispatchEvent(new StorageEvent("storage", { key: CLOUD_SALES_KEY, newValue: JSON.stringify(sales) }));
  try { new BroadcastChannel("smaxo-epos-cloud").postMessage({ type: "sale", at: Date.now() }); } catch { /* optional */ }
}

async function postSaleToCloud(payload) {
  if (CLOUD_ENDPOINT) {
    const response = await fetch(CLOUD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`API cloud indisponible (${response.status})`);
  }
  const cloudSales = readCloudSales();
  cloudSales.push(payload);
  writeCloudSales(cloudSales);
  return payload;
}

function makeTicketCode() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SMAXO-${random}`;
}

function renderHistory() {
  const sales = readSales();
  saleCount.textContent = `${sales.length} ticket${sales.length === 1 ? "" : "s"}`;
  if (!sales.length) {
    historyList.innerHTML = '<div class="empty">Aucune vente enregistrée sur cet appareil.</div>';
    return;
  }
  historyList.innerHTML = sales.slice().reverse().slice(0, 8).map((sale) => `<div class="sale"><div><strong>${sale.ticket_code}</strong><small>${new Date(sale.issued_at).toLocaleString("fr-FR")} · ${sale.payment_method}</small></div><strong>${sale.amount_xaf.toLocaleString("fr-FR")} XAF</strong></div>`).join("");
}

function showTicket(sale) {
  ticketCode.textContent = sale.ticket_code;
  ticketTime.textContent = new Date(sale.issued_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  ticketPayment.textContent = sale.payment_method;
  ticket.classList.remove("hidden");
}

document.querySelectorAll(".mode").forEach((button) => button.addEventListener("click", () => {
  paymentMethod = button.dataset.payment;
  document.querySelectorAll(".mode").forEach((item) => item.classList.toggle("active", item === button));
}));

sellButton.addEventListener("click", async () => {
  errorBox.textContent = "";
  sellButton.disabled = true;
  const sale = { ticket_code: makeTicketCode(), issued_at: new Date().toISOString(), amount_xaf: PRICE_XAF, payment_method: paymentMethod, valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: "paid" };
  const payload = { ticket: sale.ticket_code, method: paymentMethod, amount: PRICE_XAF, timestamp: Date.now() };
  try {
    await postSaleToCloud(payload);
    const sales = readSales();
    sales.push(sale);
    writeSales(sales);
    showTicket(sale);
    renderHistory();
  } catch {
    errorBox.textContent = "Vente non synchronisée : vérifiez la connexion puis réessayez.";
  } finally {
    window.setTimeout(() => { sellButton.disabled = false; }, 500);
  }
});

renderHistory();
