const STORAGE_KEY = "smaxo_epos_sales_v1";
const SOLD_KEY = "smaxo_epos_sold_tickets_v1";
const CLOUD_SALES_KEY = "smaxo_epos_cloud_sales_v1";
const CLOUD_ENDPOINT = window.SMAXO_EPOS_API || "";
let paymentMethod = "Espèces";
let selectedPlan = null;
let tariffs = [];
let ticketPool = [];
const $ = (selector) => document.querySelector(selector);
const plansBox = $("#plans"); const sellButton = $("#sellButton"); const ticket = $("#ticket"); const errorBox = $("#error"); const historyList = $("#historyList"); const saleCount = $("#saleCount");

function readJson(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function readSales() { return readJson(STORAGE_KEY); }
function readSold() { return new Set(readJson(SOLD_KEY)); }
function readCloudSales() { return readJson(CLOUD_SALES_KEY); }
function makePayload(sale) { return { ticket: sale.ticket, method: sale.method, amount: sale.amount, timestamp: Date.now() }; }

async function postSaleToCloud(payload) {
  if (CLOUD_ENDPOINT) {
    const response = await fetch(CLOUD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`API trésorerie indisponible (${response.status})`);
  }
  const cloudSales = readCloudSales(); cloudSales.push(payload); writeJson(CLOUD_SALES_KEY, cloudSales);
  try { new BroadcastChannel("smaxo-epos-cloud").postMessage({ type: "sale", payload }); } catch { /* optional */ }
}

function availableTicket(profile) { const sold = readSold(); return ticketPool.find((item) => item.profile === profile && item.status === "available" && !sold.has(item.code)); }
function renderPlans() {
  plansBox.innerHTML = tariffs.map((plan) => `<button class="plan" type="button" data-profile="${plan.profile}"><span>${plan.label}</span><strong>${plan.price_xaf.toLocaleString("fr-FR")} XAF</strong><small>${ticketPool.filter((item) => item.profile === plan.profile && item.status === "available" && !readSold().has(item.code)).length} tickets disponibles</small></button>`).join("");
  plansBox.querySelectorAll(".plan").forEach((button) => button.addEventListener("click", () => { selectedPlan = tariffs.find((plan) => plan.profile === button.dataset.profile); plansBox.querySelectorAll(".plan").forEach((item) => item.classList.toggle("active", item === button)); sellButton.disabled = false; sellButton.textContent = `Vendre ${selectedPlan.label} — ${selectedPlan.price_xaf.toLocaleString("fr-FR")} XAF`; }));
}
function renderHistory() { const sales = readSales(); saleCount.textContent = `${sales.length} ticket${sales.length === 1 ? "" : "s"}`; historyList.innerHTML = sales.length ? sales.slice().reverse().slice(0, 10).map((sale) => `<div class="sale"><div><strong>${sale.ticket}</strong><small>${new Date(sale.issued_at).toLocaleString("fr-FR")} · ${sale.profile} · ${sale.method}</small></div><strong>${sale.amount.toLocaleString("fr-FR")} XAF</strong></div>`).join("") : '<div class="empty">Aucune vente enregistrée sur cet appareil.</div>'; }
function showTicket(sale) { $("#ticketCode").textContent = sale.ticket; $("#ticketTime").textContent = new Date(sale.issued_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); $("#ticketPlan").textContent = sale.label; $("#ticketPayment").textContent = sale.method; $("#ticketAmount").textContent = `${sale.amount.toLocaleString("fr-FR")} XAF`; ticket.classList.remove("hidden"); }

document.querySelectorAll(".mode").forEach((button) => button.addEventListener("click", () => { paymentMethod = button.dataset.payment; document.querySelectorAll(".mode").forEach((item) => item.classList.toggle("active", item === button)); }));
sellButton.addEventListener("click", async () => { errorBox.textContent = ""; if (!selectedPlan) return; const item = availableTicket(selectedPlan.profile); if (!item) { errorBox.textContent = `Stock épuisé pour le forfait ${selectedPlan.label}.`; renderPlans(); return; } sellButton.disabled = true; try { const sale = { ticket: item.code, profile: item.profile, label: selectedPlan.label, method: paymentMethod, amount: selectedPlan.price_xaf, issued_at: new Date().toISOString(), status: "paid" }; await postSaleToCloud(makePayload(sale)); const sold = readSold(); sold.add(item.code); writeJson(SOLD_KEY, [...sold]); writeJson(STORAGE_KEY, [...readSales(), sale]); showTicket(sale); renderHistory(); renderPlans(); } catch (error) { errorBox.textContent = error.message || "Vente non synchronisée : réessayez."; } finally { sellButton.disabled = !selectedPlan; } });

Promise.all([fetch("tarifs.json", { cache: "no-store" }).then((response) => response.json()), fetch("tickets_pool.json", { cache: "no-store" }).then((response) => response.json())]).then(([plans, pool]) => { tariffs = plans; ticketPool = pool; renderPlans(); }).catch(() => { errorBox.textContent = "Catalogue indisponible : aucune vente ne peut être émise."; });
renderHistory();
