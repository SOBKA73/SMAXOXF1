const STORAGE_KEY = "smaxo_epos_sales_v1";
const SOLD_KEY = "smaxo_epos_sold_tickets_v1";
const CLOUD_SALES_KEY = "smaxo_epos_cloud_sales_v1";
const CLOUD_ENDPOINT = window.SMAXO_EPOS_API || "";
let paymentMethod = "Espèces";
let selectedPlan = null;
let tariffs = [];
let ticketPool = [];
let salesHistory = [];
let totalSales = 0;
let currentSessionRevenue = 0;
const $ = (selector) => document.querySelector(selector);
const plansBox = $("#plans"); const sellButton = $("#sellButton"); const ticket = $("#ticket"); const errorBox = $("#error"); const historyList = $("#historyList"); const saleCount = $("#saleCount");

function readJson(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function readSales() { return readJson(STORAGE_KEY); }
function readSold() { return new Set(readJson(SOLD_KEY)); }
function readCloudSales() { return readJson(CLOUD_SALES_KEY); }
function safeNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function safeDate(value) { const date = value ? new Date(value) : new Date(); return Number.isNaN(date.getTime()) ? new Date() : date; }
function formatXaf(value) { return `${Number(value || 0).toLocaleString("fr-FR")} XAF`; }
function normalizeSale(raw) { const sale = raw && typeof raw === "object" ? raw : {}; return { ticket: sale.ticket || sale.ticket_code || "Ticket sans code", profile: sale.profile || "profil inconnu", label: sale.label || sale.profile || "Forfait", method: sale.method || sale.payment_method || "Non précisé", amount: safeNumber(sale.amount ?? sale.amount_xaf), issued_at: sale.issued_at || sale.timestamp || new Date().toISOString(), status: sale.status || "paid" }; }
function makePayload(sale) { return { ticket: sale.ticket, method: sale.method, amount: safeNumber(sale.amount), timestamp: Date.now() }; }

async function postSaleToCloud(payload) { if (CLOUD_ENDPOINT) { const response = await fetch(CLOUD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`API trésorerie indisponible (${response.status})`); } const cloudSales = readCloudSales(); cloudSales.push(payload); writeJson(CLOUD_SALES_KEY, cloudSales); try { new BroadcastChannel("smaxo-epos-cloud").postMessage({ type: "sale", payload }); } catch { /* optional */ } }
function availableTicket(profile) { const sold = readSold(); return ticketPool.find((item) => item?.profile === profile && (item?.status === "disponible" || item?.status === "available") && item.code && !sold.has(item.code)); }
function renderPlans() { plansBox.innerHTML = tariffs.filter((plan) => plan && plan.profile).map((plan) => { const price = safeNumber(plan.price_xaf); const available = ticketPool.filter((item) => item?.profile === plan.profile && (item?.status === "disponible" || item?.status === "available") && item.code && !readSold().has(item.code)).length; return `<button class="plan" type="button" data-profile="${plan.profile}"><span>${plan.label || plan.profile}</span><strong>${formatXaf(price)}</strong><small>${available} tickets disponibles</small></button>`; }).join(""); plansBox.querySelectorAll(".plan").forEach((button) => button.addEventListener("click", () => { selectedPlan = tariffs.find((plan) => plan?.profile === button.dataset.profile); if (!selectedPlan) return; plansBox.querySelectorAll(".plan").forEach((item) => item.classList.toggle("active", item === button)); sellButton.disabled = false; sellButton.textContent = `Vendre ${selectedPlan.label || selectedPlan.profile} — ${formatXaf(selectedPlan.price_xaf)}`; })); }
function renderHistory() { salesHistory = readSales().map(normalizeSale); totalSales = salesHistory.length; currentSessionRevenue = salesHistory.reduce((total, sale) => total + Number(sale?.amount || 0), 0); saleCount.textContent = `${Number(totalSales || 0)} ticket${totalSales === 1 ? "" : "s"}`; if (!historyList) return; historyList.innerHTML = totalSales ? salesHistory.slice().reverse().slice(0, 10).map((sale) => `<div class="sale"><div><strong>${sale.ticket}</strong><small>${safeDate(sale.issued_at).toLocaleString("fr-FR")} · ${sale.profile} · ${sale.method}</small></div><strong>${formatXaf(sale.amount)}</strong></div>`).join("") : '<div class="empty">Aucune vente enregistrée sur cet appareil.</div>'; }
function showTicket(rawSale) { const sale = normalizeSale(rawSale); $("#ticketCode").textContent = sale.ticket; $("#ticketTime").textContent = safeDate(sale.issued_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); $("#ticketPlan").textContent = sale.label; $("#ticketPayment").textContent = sale.method; $("#ticketAmount").textContent = formatXaf(sale.amount); ticket.classList.remove("hidden"); }

document.querySelectorAll(".mode").forEach((button) => button.addEventListener("click", () => { paymentMethod = button.dataset.payment || "Espèces"; document.querySelectorAll(".mode").forEach((item) => item.classList.toggle("active", item === button)); }));
sellButton.addEventListener("click", async () => { errorBox.textContent = ""; if (!selectedPlan) return; const item = availableTicket(selectedPlan.profile); if (!item) { errorBox.textContent = `Stock épuisé pour le forfait ${selectedPlan.label || selectedPlan.profile}.`; renderPlans(); return; } sellButton.disabled = true; try { const sale = { ticket: item.code, profile: item.profile, label: selectedPlan.label || selectedPlan.profile, method: paymentMethod, amount: safeNumber(selectedPlan.price_xaf), issued_at: new Date().toISOString(), status: "paid" }; await postSaleToCloud(makePayload(sale)); const sold = readSold(); sold.add(item.code); item.status = "utilisé"; writeJson(SOLD_KEY, [...sold]); writeJson(STORAGE_KEY, [...readSales(), sale]); showTicket(sale); renderHistory(); renderPlans(); } catch (error) { errorBox.textContent = error.message || "Vente non synchronisée : réessayez."; } finally { sellButton.disabled = !selectedPlan; } });

Promise.all([fetch("tarifs.json", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("tarifs"); return response.json(); }), fetch("tickets_pool.json", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("pool"); return response.json(); })]).then(([plans, pool]) => { tariffs = Array.isArray(plans) ? plans : []; ticketPool = Array.isArray(pool) ? pool : []; renderPlans(); }).catch(() => { errorBox.textContent = "Catalogue indisponible : aucune vente ne peut être émise."; });
renderHistory();
