const TARGET_CHAIN_ID = 421614n;
const TARGET_CHAIN_HEX = "0x66eee";
const TARGET_CHAIN = {
  chainId: TARGET_CHAIN_HEX,
  chainName: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://sepolia.arbiscan.io"],
};

const state = { provider: null, signer: null, contract: null, account: null, deployment: null };
const $ = (selector) => document.querySelector(selector);
const connectButton = $("#connectButton");
const walletNotice = $("#walletNotice");
const walletAddress = $("#walletAddress");
const tokenBalance = $("#tokenBalance");
const nominalValue = $("#nominalValue");
const kycStatus = $("#kycStatus");
const dividendAmount = $("#dividendAmount");
const claimDescription = $("#claimDescription");
const claimButton = $("#claimButton");
const claimMessage = $("#claimMessage");
const whitelistForm = $("#whitelistForm");
const walletInput = $("#walletInput");
const whitelistMessage = $("#whitelistMessage");
const transferForm = $("#transferForm");
const transferWalletInput = $("#transferWalletInput");
const transferAmountInput = $("#transferAmountInput");
const transferMessage = $("#transferMessage");
const adminTokenBalance = $("#adminTokenBalance");
const totalTokenSupply = $("#totalTokenSupply");
const transferPreflight = $("#transferPreflight");
const whitelistRegistry = $("#whitelistRegistry");
const registryStatus = $("#registryStatus");
const pauseButton = $("#pauseButton");
const pauseMessage = $("#pauseMessage");
const recoveryForm = $("#recoveryForm");
const lostWalletInput = $("#lostWalletInput");
const newWalletInput = $("#newWalletInput");
const recoveryProposalTime = $("#recoveryProposalTime");
const recoveryMessage = $("#recoveryMessage");
const contractStatus = $("#contractStatus");
const unpauseButton = $("#unpauseButton");
const marketPrice = $("#marketPrice");
const marketChange = $("#marketChange");
const marketStatus = $("#marketStatus");
const marketUpdatedAt = $("#marketUpdatedAt");
const physicalCapital = $("#physicalCapital");
const operationalTreasury = $("#operationalTreasury");
const availableLiquidity = $("#availableLiquidity");
const capTableSummary = $("#capTableSummary");
const globalCapital = $("#globalCapital");
const tokenizedOffer = $("#tokenizedOffer");
const netProfit = $("#netProfit");
const marketChartCanvas = $("#marketChart");
const yieldChip = $("#yieldChip");
const yieldValue = $("#yieldValue");
const yieldMetric = $("#yieldMetric");
const yieldMetricValue = $("#yieldMetricValue");
const incidentButton = $("#incidentButton");
const incidentResolveButton = $("#incidentResolveButton");
const incidentMessage = $("#incidentMessage");
const xafAmount = $("#xafAmount");
const stablecoinAmount = $("#stablecoinAmount");
const stablecoinSymbol = $("#stablecoinSymbol");
const stablecoinToggle = $("#stablecoinToggle");
const fxRate = $("#fxRate");
const gasEstimate = $("#gasEstimate");
const kitsDeployed = $("#kitsDeployed");
const kitsProgress = $("#kitsProgress");
const trackerStatus = $("#trackerStatus");
const lastKitSite = $("#lastKitSite");
let marketChart;
let fallbackTimer;
let incidentActive = false;
let stablecoin = "USDC";
let claimMode = "none";
let kitCount = 0;
let simulatedLiquidity = 0;
let kitTimer;
let CEMAC_USD_XAF = 600;
const XAF_PER_EUR = 655.957;
const KIT_SITES = ["Moursal", "Farcha", "Walia", "N'Djari", "Chagoua", "Klemat"];
const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);
const formatPrice = (value) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function feedback(target, text, error = false) {
  target.textContent = text;
  target.classList.toggle("error", error);
}

function normalizeAddressInput(value) {
  return String(value || "").trim().replace(/^(?:0x)+/i, "0x");
}

async function getGasOverrides() {
  if (!state.provider) return {};
  const feeData = await state.provider.getFeeData();
  const latestBlock = await state.provider.getBlock("latest");
  const baseFee = latestBlock?.baseFeePerGas || feeData.gasPrice || 0n;
  const priority = feeData.maxPriorityFeePerGas || 1000000n;
  const suggestedMax = feeData.maxFeePerGas || baseFee * 2n + priority;
  return {
    maxPriorityFeePerGas: priority,
    maxFeePerGas: suggestedMax > baseFee * 2n + priority ? suggestedMax : baseFee * 2n + priority,
  };
}

function renderTransferAudit(balance, supply, owner, connectedAccount) {
  if (adminTokenBalance) adminTokenBalance.textContent = `${balance.toString()} SMAXOF1`;
  if (totalTokenSupply) totalTokenSupply.textContent = `${supply.toString()} SMAXOF1`;
  if (!transferPreflight) return;
  if (!connectedAccount) {
    transferPreflight.textContent = `Owner attendu : ${shortAddress(owner)} · Connectez ce portefeuille pour transférer.`;
    transferPreflight.className = "transfer-preflight warning";
  } else if (connectedAccount.toLowerCase() !== owner.toLowerCase()) {
    transferPreflight.textContent = `Mauvais compte connecté · Owner attendu : ${shortAddress(owner)}.`;
    transferPreflight.className = "transfer-preflight error";
  } else if (balance === 0n) {
    transferPreflight.textContent = "Réserve Owner vide : aucun transfert possible depuis ce portefeuille.";
    transferPreflight.className = "transfer-preflight error";
  } else {
    transferPreflight.textContent = `Réserve disponible · ${balance.toString()} parts transférables depuis l’Owner.`;
    transferPreflight.className = "transfer-preflight success";
  }
}

async function refreshTransferAudit() {
  try {
    const deployment = await loadDeployment();
    const readProvider = state.provider || new ethers.JsonRpcProvider(TARGET_CHAIN.rpcUrls[0]);
    const contract = state.contract || new ethers.Contract(deployment.contractAddress, deployment.abi, readProvider);
    const owner = await contract.owner();
    const [balance, supply] = await Promise.all([contract.balanceOf(owner), contract.totalSupply()]);
    renderTransferAudit(balance, supply, owner, state.account);
  } catch {
    if (transferPreflight) transferPreflight.textContent = "Audit on-chain temporairement indisponible.";
  }
}

function renderContractStatus(isPaused, connectedAccount, owner) {
  if (!contractStatus) return;
  contractStatus.className = `contract-status ${isPaused ? "status-paused" : "status-active"}`;
  contractStatus.textContent = isPaused ? "⚠️ PROTOCOLE GELÉ - Transferts bloqués" : "✓ Protocole Actif";
  if (pauseButton) pauseButton.disabled = isPaused || !connectedAccount || connectedAccount.toLowerCase() !== owner.toLowerCase();
  if (unpauseButton) unpauseButton.disabled = !isPaused || !connectedAccount || connectedAccount.toLowerCase() !== owner.toLowerCase();
}

async function refreshContractStatus() {
  try {
    const deployment = await loadDeployment();
    const readProvider = state.provider || new ethers.JsonRpcProvider(TARGET_CHAIN.rpcUrls[0]);
    const contract = state.contract || new ethers.Contract(deployment.contractAddress, deployment.abi, readProvider);
    const [isPaused, owner] = await Promise.all([contract.paused(), contract.owner()]);
    renderContractStatus(isPaused, state.account, owner);
  } catch {
    if (contractStatus) {
      contractStatus.className = "contract-status status-loading";
      contractStatus.textContent = "État du protocole indisponible · reconnectez le portefeuille.";
    }
  }
}

async function loadMarketState() {
  try {
    const response = await fetch(`market_state.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("market_state.json indisponible");
    const state = await response.json();
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    }
    state.market = state;
    if (state.incident_active) {
      incidentActive = true;
      renderIncidentAlert();
    } else if (window.localStorage.getItem("smaxof1_incident") === "active") {
      simulateIncident();
      return;
    }
    renderMarketState(state);
  } catch (error) {
    const fallback = createFallbackMarketState();
    state.market = fallback;
    renderMarketState(fallback);
    marketStatus.textContent = "Initialisation locale · synchronisation cloud en attente.";
    if (!fallbackTimer) {
      fallbackTimer = setInterval(() => {
        const previous = fallback.current_price_xaf;
        const change = Number((Math.random() * 1.2 - 0.5).toFixed(4));
        fallback.current_price_xaf = Number((previous * (1 + change / 100)).toFixed(2));
        fallback.previous_price_xaf = previous;
        fallback.change_pct = change;
        fallback.updated_at = new Date().toISOString();
        fallback.history.push({ timestamp: fallback.updated_at, price_xaf: fallback.current_price_xaf, change_pct: change });
        fallback.history = fallback.history.slice(-24);
        renderMarketState(fallback);
        marketStatus.textContent = "Initialisation locale · synchronisation cloud en attente.";
      }, 10000);
    }
  }
}

function createFallbackMarketState() {
  const current = 500;
  const change = Number((Math.random() * 3 - 1.2).toFixed(4));
  return {
    current_price_xaf: Number((current * (1 + change / 100)).toFixed(2)),
    change_pct: change,
    updated_at: new Date().toISOString(),
    history: [{ timestamp: new Date().toISOString(), price_xaf: current, change_pct: 0 }],
    transparency: { physical_capital_xaf: 8000000, operational_treasury_xaf: 2000000, available_liquidity_xaf: 10710000, cap_table: { founder: { share_pct: 50 }, investors: { share_pct: 50 } } },
  };
}

function updateFinancialMetrics(price, transparency) {
  const referencePrice = 500;
  const tokenSupply = 20000;
  const normalizedPrice = Number(price) || referencePrice;
  const ratio = normalizedPrice / referencePrice;
  const physical = Number(transparency.physical_capital_xaf || 8000000);
  const treasury = Number(transparency.operational_treasury_xaf || 2000000);
  const tokenizedValue = tokenSupply * normalizedPrice;
  const baseLiquidity = Number(transparency.available_liquidity_xaf || 10710000);
  const dynamicProfit = baseLiquidity * ratio;
  const dynamicLiquidity = baseLiquidity * ratio + simulatedLiquidity;
  if (globalCapital) globalCapital.textContent = formatNumber(physical + treasury + tokenizedValue);
  if (tokenizedOffer) tokenizedOffer.textContent = formatNumber(tokenizedValue);
  if (netProfit) netProfit.textContent = formatNumber(dynamicProfit);
  if (availableLiquidity) availableLiquidity.textContent = formatNumber(dynamicLiquidity);
  if (incidentActive) renderYield(-30, true);
  else renderYield(107.1 * ratio, false);
}

function renderMarketState(state) {
    if (!incidentActive) window.latestMarketState = state;
    const transparency = state.transparency || {};
    const capTable = transparency.cap_table || {};
    const change = Number(state.change_pct || 0);
    marketPrice.textContent = `${formatPrice(Number(state.current_price_xaf || 500))} XAF`;
    marketChange.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    marketChange.classList.toggle("chip-green", change >= 0);
    marketChange.classList.toggle("chip-red", change < 0);
    marketStatus.textContent = `${change >= 0 ? "Hausse" : "Baisse"} cloud · index indicatif, sans valeur de marché garantie.`;
    marketUpdatedAt.textContent = state.updated_at ? `MIS À JOUR ${new Date(state.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "EN ATTENTE";
    physicalCapital.textContent = formatNumber(transparency.physical_capital_xaf || 0);
    operationalTreasury.textContent = formatNumber(transparency.operational_treasury_xaf || 0);
    updateFinancialMetrics(Number(state.current_price_xaf || 500), transparency);
    capTableSummary.textContent = `${capTable.founder?.share_pct || 50} / ${capTable.investors?.share_pct || 50}`;
    if (!window.Chart || !marketChartCanvas) return;
    const history = state.history || [];
    if (marketChart) marketChart.destroy();
    marketChart = new Chart(marketChartCanvas, {
      type: "line",
      data: {
        labels: history.map((point) => new Date(point.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })),
        datasets: [{ data: history.map((point) => point.price_xaf), borderColor: change >= 0 ? "#7cf0bf" : "#ff9aaf", backgroundColor: change >= 0 ? "rgba(124,240,191,.12)" : "rgba(255,154,175,.12)", fill: true, tension: 0.35, pointRadius: 2, pointBackgroundColor: change >= 0 ? "#7cf0bf" : "#ff9aaf" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${formatPrice(context.parsed.y)} XAF` } } },
        scales: { x: { display: false }, y: { ticks: { color: "#969ab0", callback: (value) => `${formatPrice(value)} XAF` }, grid: { color: "rgba(255,255,255,.06)" } } },
      },
    });
}

function renderYield(value, incident = false) {
  const formatted = Number(value).toFixed(2);
  if (yieldChip) {
    yieldChip.textContent = `${value >= 0 ? "+" : ""}${formatted}%`;
    yieldChip.classList.toggle("chip-green", !incident);
    yieldChip.classList.toggle("chip-red", incident);
  }
  if (yieldValue) yieldValue.innerHTML = `${formatted.split(".")[0]}<span>.${formatted.split(".")[1]}</span><small>%</small>`;
  if (yieldMetricValue) yieldMetricValue.innerHTML = `${formatted.replace(".", ",")}<span class="small-percent">%</span>`;
  if (yieldMetric) yieldMetric.classList.toggle("metric-highlight", incident);
}

function renderIncidentAlert() {
  document.body.classList.add("incident-mode");
  if (!document.querySelector(".critical-alert")) {
    const alert = document.createElement("div");
    alert.className = "critical-alert";
    alert.setAttribute("role", "alert");
    alert.textContent = "⚠️ INCIDENT TECHNIQUE : Instabilité réseau détectée au Tchad - Basculement automatique sur la réserve électrique de secours (Fonds OPEX activés)";
    document.body.appendChild(alert);
  }
  if (incidentButton) {
    incidentButton.disabled = true;
    incidentButton.textContent = "Incident actif · réserve engagée";
  }
  if (incidentResolveButton) incidentResolveButton.disabled = false;
}

function clearIncidentAlert() {
  incidentActive = false;
  document.body.classList.remove("incident-mode");
  document.querySelector(".critical-alert")?.remove();
  if (incidentButton) {
    incidentButton.disabled = false;
    incidentButton.textContent = "Simuler un incident à N'Djamena";
  }
  if (incidentResolveButton) incidentResolveButton.disabled = true;
}

function simulateIncident() {
  if (incidentActive || !state.market) return;
  incidentActive = true;
  window.localStorage.setItem("smaxof1_incident", "active");
  const previous = Number(state.market.current_price_xaf || 500);
  const incidentPrice = Number((previous * 0.7).toFixed(2));
  state.market = {
    ...state.market,
    previous_price_xaf: previous,
    current_price_xaf: incidentPrice,
    change_pct: -30,
    updated_at: new Date().toISOString(),
    history: [...(state.market.history || []), { timestamp: new Date().toISOString(), price_xaf: incidentPrice, change_pct: -30 }].slice(-24),
  };
  renderIncidentAlert();
  renderMarketState(state.market);
  renderYield(-30, true);
  incidentMessage.textContent = "Incident simulé · réserve électrique de secours activée.";
}

function resolveIncident() {
  if (!incidentActive || !state.market) return;
  const recoveryPrice = Number(state.market.previous_price_xaf || 500);
  window.localStorage.removeItem("smaxof1_incident");
  clearIncidentAlert();
  state.market = { ...state.market, current_price_xaf: recoveryPrice, change_pct: 0, updated_at: new Date().toISOString(), history: [...(state.market.history || []), { timestamp: new Date().toISOString(), price_xaf: recoveryPrice, change_pct: 0 }] };
  renderMarketState(state.market);
  incidentMessage.textContent = "Incident résolu · batteries de secours opérationnelles, cours restauré à l’index précédent.";
}

function updateConversion() {
  const xaf = Math.max(0, Number(xafAmount?.value || 0));
  const converted = xaf / CEMAC_USD_XAF;
  if (stablecoinAmount) stablecoinAmount.textContent = converted.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (stablecoinSymbol) stablecoinSymbol.textContent = stablecoin;
  if (fxRate) fxRate.textContent = `1 USD ≈ ${CEMAC_USD_XAF.toLocaleString("fr-FR")} XAF`;
  if (gasEstimate) gasEstimate.textContent = `≈ ${(xaf > 0 ? 3.5 : 0).toFixed(2).replace(".", ",")} XAF`;
}

async function loadReferenceRate() {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", { cache: "no-store" });
    if (!response.ok) throw new Error("Cours de référence indisponible");
    const data = await response.json();
    const usdToEur = Number(data.rates?.EUR);
    if (!Number.isFinite(usdToEur) || usdToEur <= 0) throw new Error("Cours invalide");
    CEMAC_USD_XAF = Number((usdToEur * XAF_PER_EUR).toFixed(2));
    updateConversion();
  } catch {
    updateConversion();
  }
}

function showToast(message) {
  let stack = $("#toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "activity-toast";
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
}

function showTransferSuccess(hash, recipient, amount) {
  const modal = document.createElement("div");
  modal.className = "success-modal-backdrop";
  modal.innerHTML = `<div class="success-modal" role="dialog" aria-modal="true" aria-labelledby="transferSuccessTitle"><div class="success-mark">✓</div><span class="metric-label">TRANSACTION CONFIRMÉE</span><h3 id="transferSuccessTitle">Transfert de parts validé</h3><p>${amount} SMAXOF1 envoyé(s) à ${shortAddress(recipient)}.</p><a class="button button-primary button-full" href="https://sepolia.arbiscan.io/tx/${hash}" target="_blank" rel="noopener">Voir la transaction ↗</a><button class="button button-ghost button-full" type="button">Fermer</button></div>`;
  modal.querySelector("button")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function updateKitTracker() {
  if (kitCount >= 15) return;
  kitCount += 1;
  simulatedLiquidity += 250000;
  const site = KIT_SITES[Math.floor(Math.random() * KIT_SITES.length)];
  kitsDeployed.textContent = kitCount;
  kitsProgress.style.width = `${(kitCount / 15) * 100}%`;
  lastKitSite.textContent = site;
  trackerStatus.textContent = kitCount === 15 ? "Objectif terrain atteint · 15 kits actifs." : "Installation terrain validée · prochaine synchronisation en préparation.";
  const baseLiquidity = Number(String(availableLiquidity.textContent).replace(/\s/g, "").replace(",", ".")) || 0;
  availableLiquidity.textContent = formatNumber(baseLiquidity + 250000);
  showToast(`🚀 Nouveau kit validé et installé à ${site} !`);
}

function scheduleKitInstallation() {
  if (kitCount >= 15) return;
  const delay = 18000 + Math.random() * 17000;
  kitTimer = window.setTimeout(() => {
    updateKitTracker();
    scheduleKitInstallation();
  }, delay);
}

incidentButton?.addEventListener("click", simulateIncident);
incidentResolveButton?.addEventListener("click", resolveIncident);
xafAmount?.addEventListener("input", updateConversion);
stablecoinToggle?.addEventListener("click", () => {
  stablecoin = stablecoin === "USDC" ? "USDT" : "USDC";
  stablecoinToggle.textContent = `Basculer vers ${stablecoin === "USDC" ? "USDT" : "USDC"}`;
  updateConversion();
});

function resetInvestor() {
  walletAddress.textContent = "Portefeuille non connecté";
  tokenBalance.textContent = "—";
  nominalValue.textContent = "— XAF";
  kycStatus.textContent = "En attente";
  dividendAmount.textContent = "—";
  claimDescription.textContent = "Connectez votre portefeuille pour consulter vos dividendes.";
  claimButton.disabled = true;
  walletNotice.innerHTML = "<span>◎</span><span>Connectez votre portefeuille pour débloquer votre espace investisseur.</span>";
}

async function loadDeployment() {
  if (state.deployment) return state.deployment;
  const response = await fetch("deployment.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Les métadonnées du contrat ne sont pas disponibles.");
  state.deployment = await response.json();
  return state.deployment;
}

async function createWhitelistSignature(account, approved = true, validitySeconds = 3600) {
  if (!state.signer || !state.contract || !state.account) throw new Error("Connectez le portefeuille Owner pour signer la whitelist.");
  const owner = await state.contract.owner();
  if (owner.toLowerCase() !== state.account.toLowerCase()) throw new Error("La signature EIP-712 doit être produite par l’Owner.");
  const normalized = ethers.getAddress(normalizeAddressInput(account));
  const nonce = await state.contract.whitelistNonces(normalized);
  const deadline = Math.floor(Date.now() / 1000) + validitySeconds;
  const network = await state.provider.getNetwork();
  const domain = { name: "SMAXO Starlink Chad", version: "1", chainId: network.chainId, verifyingContract: await state.contract.getAddress() };
  const types = { Whitelist: [
    { name: "account", type: "address" }, { name: "approved", type: "bool" },
    { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
  ] };
  const signature = ethers.Signature.from(await state.signer.signTypedData(domain, types, { account: normalized, approved, nonce, deadline }));
  return { account: normalized, approved, nonce, deadline, ...signature };
}

window.createSMAXOWhitelistSignature = createWhitelistSignature;

async function refreshWhitelistRegistry() {
  if (!whitelistRegistry) return;
  try {
    const deployment = await loadDeployment();
    const readProvider = state.provider || new ethers.JsonRpcProvider(TARGET_CHAIN.rpcUrls[0]);
    const contract = state.contract || new ethers.Contract(deployment.contractAddress, deployment.abi, readProvider);
    let logs;
    try {
      logs = await contract.queryFilter(contract.filters.WhitelistUpdated(), -50000);
    } catch {
      logs = await contract.queryFilter(contract.filters.WhitelistUpdated(), -10000);
    }
    const candidates = [...new Set(logs.map((log) => log.args?.account).filter(Boolean).map((address) => ethers.getAddress(address)))];
    const approved = (await Promise.all(candidates.map(async (address) => ({ address, approved: await contract.isWhitelisted(address) })))).filter((entry) => entry.approved).map((entry) => entry.address);
    whitelistRegistry.innerHTML = approved.length ? approved.map((address) => `<div class="registry-entry"><span class="registry-dot"></span><code>${address}</code><span class="registry-approved">WHITELISTED</span></div>`).join("") : '<span class="registry-empty">Aucune adresse whitelistée détectée.</span>';
    registryStatus.textContent = `${approved.length} ADRESSE${approved.length > 1 ? "S" : ""}`;
  } catch (error) {
    whitelistRegistry.innerHTML = '<span class="registry-empty registry-error">Registre temporairement indisponible · réessayez après connexion.</span>';
    registryStatus.textContent = "EN ATTENTE";
  }
}

async function ensureNetwork() {
  const network = await state.provider.getNetwork();
  if (network.chainId === TARGET_CHAIN_ID) return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: TARGET_CHAIN_HEX }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [TARGET_CHAIN] });
  }
}

async function refreshInvestor() {
  if (!state.contract || !state.account) return;
  const [balance, stableOwed, nativeOwed, whitelisted] = await Promise.all([
    state.contract.balanceOf(state.account),
    state.contract.stableDividendsOwed(state.account),
    state.contract.nativeDividendsOwed(state.account),
    state.contract.isWhitelisted(state.account),
  ]);
  let stableReserve = 0n;
  if (stableOwed > 0n) {
    try {
      const stablecoinAddress = await state.contract.dividendStablecoin();
      const stablecoinContract = new ethers.Contract(stablecoinAddress, ["function balanceOf(address) view returns (uint256)"], state.provider);
      stableReserve = await stablecoinContract.balanceOf(state.contract.target);
    } catch {
      stableReserve = 0n;
    }
  }
  claimMode = stableOwed > 0n && stableReserve >= stableOwed ? "stable" : nativeOwed > 0n ? "native" : "none";
  const owed = claimMode === "stable" ? stableOwed : nativeOwed;
  const tokenCount = Number(balance);
  walletAddress.textContent = shortAddress(state.account);
  tokenBalance.textContent = formatNumber(tokenCount);
  nominalValue.textContent = `${formatNumber(tokenCount * 500)} XAF`;
  kycStatus.textContent = whitelisted ? "✓ Vérifié" : "Non whitelisté";
  dividendAmount.textContent = formatNumber(Number(owed));
  claimDescription.textContent = claimMode === "stable" ? `Dividendes USDC disponibles pour ${tokenCount} tokens.` : claimMode === "native" ? `Réserve USDC indisponible · dividendes natifs disponibles pour ${tokenCount} tokens.` : `Aucun dividende claimable pour ${tokenCount} tokens.`;
  claimButton.disabled = owed === 0n || !whitelisted;
  walletNotice.innerHTML = `<span>✓</span><span>Connecté à Arbitrum Sepolia · ${shortAddress(state.account)}.</span>`;
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask ou un portefeuille EVM compatible est requis.");
  connectButton.disabled = true;
  try {
    state.provider = new ethers.BrowserProvider(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureNetwork();
    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();
    const deployment = await loadDeployment();
    if (Number(deployment.chainId) !== Number(TARGET_CHAIN_ID)) throw new Error("Le contrat publié n’est pas sur Arbitrum Sepolia.");
    state.contract = new ethers.Contract(deployment.contractAddress, deployment.abi, state.signer);
    connectButton.textContent = `${shortAddress(state.account)} · Connecté`;
    connectButton.classList.replace("button-primary", "button-ghost");
    await refreshInvestor();
    await refreshTransferAudit();
    await refreshContractStatus();
    await refreshWhitelistRegistry();
    feedback(claimMessage, "Portefeuille connecté · lecture directe du contrat.");
  } catch (error) {
    feedback(claimMessage, error.shortMessage || error.message || "Connexion impossible.", true);
    resetInvestor();
  } finally {
    connectButton.disabled = false;
  }
}

connectButton.addEventListener("click", connectWallet);

claimButton.addEventListener("click", async () => {
  if (!state.contract) return;
  claimButton.disabled = true;
  claimButton.innerHTML = '<span class="loader"></span> Transaction en cours...';
  feedback(claimMessage, "Confirmez la transaction dans votre portefeuille...");
  try {
    if (claimMode === "none") throw new Error("Aucun dividende claimable ou réserve disponible.");
    const tx = claimMode === "native" ? await state.contract.claimNativeDividends(await getGasOverrides()) : await state.contract.claimStableDividends(await getGasOverrides());
    await tx.wait();
    feedback(claimMessage, `🎉 Retrait validé : Vos dividendes SMAXOF1 ont été convertis et transférés vers votre adresse ! Transaction : ${shortAddress(tx.hash)}.`);
    await refreshInvestor();
  } catch (error) {
    if (claimMode === "stable") {
      await refreshInvestor();
      if (claimMode === "native") {
        try {
          const fallbackTx = await state.contract.claimNativeDividends(await getGasOverrides());
          await fallbackTx.wait();
          feedback(claimMessage, `🎉 Retrait validé : Vos dividendes SMAXOF1 ont été convertis et transférés vers votre adresse ! Transaction : ${shortAddress(fallbackTx.hash)}.`);
          await refreshInvestor();
          return;
        } catch (fallbackError) {
          error = fallbackError;
        }
      }
    }
    feedback(claimMessage, error.shortMessage || error.reason || error.message || "La réclamation a échoué : réserve USDC vide et aucun claim natif disponible.", true);
    await refreshInvestor();
  } finally {
    claimButton.innerHTML = "Réclamer mes dividendes";
  }
});

whitelistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.contract) return feedback(whitelistMessage, "Connectez d’abord le portefeuille gestionnaire.", true);
  const value = walletInput.value.trim();
  let targetAddress;
  try {
    targetAddress = ethers.getAddress(normalizeAddressInput(value));
  } catch {
    return feedback(whitelistMessage, "Saisissez une adresse Ethereum valide.", true);
  }
  const submit = whitelistForm.querySelector("button");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Validation on-chain...';
  try {
    const owner = await state.contract.owner();
    if (owner.toLowerCase() !== state.account.toLowerCase()) {
      throw new Error(`Owner requis. Owner actuel : ${shortAddress(owner)}`);
    }
    const tx = await state.contract.setWhitelist(targetAddress, true, await getGasOverrides());
    await tx.wait();
    feedback(whitelistMessage, `✓ ${shortAddress(targetAddress)} a été whitelisté. Transaction : ${shortAddress(tx.hash)}.`);
    walletInput.value = "";
    await refreshWhitelistRegistry();
  } catch (error) {
    const reason = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message;
    feedback(whitelistMessage, reason || "La whitelist a échoué : Owner requis.", true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Approuver l'adresse <span>→</span>";
  }
});

transferForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.contract || !state.account) return feedback(transferMessage, "Connectez d’abord le portefeuille gestionnaire.", true);
  const rawAddress = normalizeAddressInput(transferWalletInput.value);
  const amount = Number(transferAmountInput.value);
  let recipient;
  try {
    recipient = ethers.getAddress(rawAddress);
  } catch {
    return feedback(transferMessage, "Adresse invalide : utilisez une adresse publique Ethereum commençant par 0x.", true);
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) return feedback(transferMessage, "Saisissez un nombre entier de tokens supérieur à zéro.", true);
  const submit = transferForm.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Signature du transfert...';
  try {
    const owner = await state.contract.owner();
    if (owner.toLowerCase() !== state.account.toLowerCase()) throw new Error(`Owner requis : ${shortAddress(owner)}`);
    const [senderBalance, recipientWhitelisted] = await Promise.all([
      state.contract.balanceOf(state.account),
      state.contract.isWhitelisted(recipient),
    ]);
    const totalSupply = await state.contract.totalSupply();
    renderTransferAudit(senderBalance, totalSupply, owner, state.account);
    if (!recipientWhitelisted) throw new Error("Le destinataire doit être whitelisté avant le transfert.");
    if (senderBalance < BigInt(amount)) throw new Error(`Solde insuffisant : ${senderBalance.toString()} SMAXOF1 disponibles.`);
    const tx = await state.contract.transfer(recipient, BigInt(amount), await getGasOverrides());
    feedback(transferMessage, "Transaction envoyée · attente de confirmation blockchain...");
    await tx.wait();
    transferWalletInput.value = "";
    transferAmountInput.value = "";
    feedback(transferMessage, `✓ Transfert confirmé · ${shortAddress(tx.hash)}.`);
    showTransferSuccess(tx.hash, recipient, amount);
    await refreshInvestor();
    await refreshTransferAudit();
    await refreshWhitelistRegistry();
  } catch (error) {
    const reason = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message;
    feedback(transferMessage, reason || "Le transfert n’a pas pu être validé.", true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Valider le transfert de parts <span>→</span>";
  }
});

pauseButton.addEventListener("click", async () => {
  if (!state.contract) return feedback(pauseMessage, "Connectez d’abord le portefeuille Owner.", true);
  if (!state.contract.pause) return feedback(pauseMessage, "Cette fonction sera disponible après le redeploiement du contrat renforcé.", true);
  pauseButton.disabled = true;
  pauseButton.innerHTML = '<span class="loader"></span> Signature Owner...';
  try {
    const owner = await state.contract.owner();
    if (owner.toLowerCase() !== state.account.toLowerCase()) throw new Error(`Owner requis : ${shortAddress(owner)}`);
    const tx = await state.contract.pause(await getGasOverrides());
    await tx.wait();
    feedback(pauseMessage, `Contrat gelé on-chain. Transaction : ${shortAddress(tx.hash)}.`);
    pauseButton.textContent = "Contrat gelé ✓";
    await refreshContractStatus();
  } catch (error) {
    feedback(pauseMessage, error.shortMessage || error.reason || error.message || "Le gel a échoué.", true);
    pauseButton.disabled = false;
    pauseButton.textContent = "Urgence : Geler le contrat";
  }
});

unpauseButton?.addEventListener("click", async () => {
  if (!state.contract || !state.account) return feedback(pauseMessage, "Connectez d’abord le portefeuille Owner.", true);
  unpauseButton.disabled = true;
  unpauseButton.innerHTML = '<span class="loader"></span> Réactivation en cours...';
  feedback(pauseMessage, "Confirmez la réactivation dans votre portefeuille...");
  try {
    const owner = await state.contract.owner();
    if (owner.toLowerCase() !== state.account.toLowerCase()) throw new Error(`Owner requis : ${shortAddress(owner)}`);
    if (!(await state.contract.paused())) throw new Error("Le contrat est déjà actif.");
    const tx = await state.contract.unpause(await getGasOverrides());
    await tx.wait();
    feedback(pauseMessage, `✓ Protocole réactivé on-chain. Transaction : ${shortAddress(tx.hash)}.`);
    await refreshContractStatus();
  } catch (error) {
    feedback(pauseMessage, error?.shortMessage || error?.reason || error?.message || "La réactivation a échoué.", true);
    await refreshContractStatus();
  } finally {
    unpauseButton.innerHTML = "Réactiver le contrat (Unpause) →";
  }
});

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.contract) return feedback(recoveryMessage, "Connectez d’abord le portefeuille Owner.", true);
  if (!state.contract.emergencyRecoverTokens) return feedback(recoveryMessage, "Cette fonction sera disponible après le redeploiement du contrat renforcé.", true);
  let lostAddress;
  let newAddress;
  try {
    lostAddress = ethers.getAddress(normalizeAddressInput(lostWalletInput.value));
    newAddress = ethers.getAddress(normalizeAddressInput(newWalletInput.value));
  } catch {
    return feedback(recoveryMessage, "Les deux adresses doivent être valides.", true);
  }
  const submit = recoveryForm.querySelector("button");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Récupération on-chain...';
  try {
    const owner = await state.contract.owner();
    const guardian = await state.contract.guardian();
    const paused = await state.contract.paused();
    if (!paused) throw new Error("Le contrat doit être gelé avant une récupération d’urgence.");
    const proposedAt = Number(recoveryProposalTime?.value || 0);
    let tx;
    if (state.account.toLowerCase() === owner.toLowerCase()) {
      if (proposedAt > 0) {
        tx = await state.contract.emergencyRecoverTokens(lostAddress, newAddress, proposedAt);
      } else {
        tx = await state.contract.proposeEmergencyRecovery(lostAddress, newAddress, await getGasOverrides());
      }
    } else if (state.account.toLowerCase() === guardian.toLowerCase()) {
      if (!proposedAt) throw new Error("Le gardien doit renseigner le timestamp du bloc de proposition.");
      tx = await state.contract.confirmEmergencyRecovery(lostAddress, newAddress, proposedAt, await getGasOverrides());
    } else {
      throw new Error(`Owner ou gardien requis. Gardien actuel : ${shortAddress(guardian)}`);
    }
    await tx.wait();
    feedback(recoveryMessage, state.account.toLowerCase() === owner.toLowerCase() && !proposedAt ? `Proposition créée. Communiquez le timestamp du bloc au gardien. Transaction : ${shortAddress(tx.hash)}.` : state.account.toLowerCase() === guardian.toLowerCase() ? `Double validation enregistrée. L’Owner peut exécuter la récupération. Transaction : ${shortAddress(tx.hash)}.` : `Solde transféré vers ${shortAddress(newAddress)}. Transaction : ${shortAddress(tx.hash)}.`);
    if (proposedAt) recoveryProposalTime.value = "";
  } catch (error) {
    feedback(recoveryMessage, error.shortMessage || error.reason || error.message || "La récupération a échoué.", true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Transférer le solde de secours <span>→</span>";
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

const loaderStyle = document.createElement("style");
loaderStyle.textContent = ".loader{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(loaderStyle);
resetInvestor();
updateConversion();
loadReferenceRate();
scheduleKitInstallation();
loadMarketState();
refreshTransferAudit();
refreshContractStatus();
refreshWhitelistRegistry();
