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
const pauseButton = $("#pauseButton");
const pauseMessage = $("#pauseMessage");
const recoveryForm = $("#recoveryForm");
const lostWalletInput = $("#lostWalletInput");
const newWalletInput = $("#newWalletInput");
const recoveryMessage = $("#recoveryMessage");
const marketPrice = $("#marketPrice");
const marketChange = $("#marketChange");
const marketStatus = $("#marketStatus");
const marketUpdatedAt = $("#marketUpdatedAt");
const physicalCapital = $("#physicalCapital");
const operationalTreasury = $("#operationalTreasury");
const availableLiquidity = $("#availableLiquidity");
const capTableSummary = $("#capTableSummary");
const marketChartCanvas = $("#marketChart");
let marketChart;
let fallbackTimer;
const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);
const formatPrice = (value) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function feedback(target, text, error = false) {
  target.textContent = text;
  target.classList.toggle("error", error);
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
    renderMarketState(state);
  } catch (error) {
    const fallback = createFallbackMarketState();
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

function renderMarketState(state) {
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
    availableLiquidity.textContent = formatNumber(transparency.available_liquidity_xaf || 0);
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
  const [balance, owed, whitelisted] = await Promise.all([
    state.contract.balanceOf(state.account),
    state.contract.stableDividendsOwed(state.account),
    state.contract.isWhitelisted(state.account),
  ]);
  const tokenCount = Number(balance);
  walletAddress.textContent = shortAddress(state.account);
  tokenBalance.textContent = formatNumber(tokenCount);
  nominalValue.textContent = `${formatNumber(tokenCount * 500)} XAF`;
  kycStatus.textContent = whitelisted ? "✓ Vérifié" : "Non whitelisté";
  dividendAmount.textContent = formatNumber(Number(owed));
  claimDescription.textContent = `Solde on-chain de dividendes stablecoin pour ${tokenCount} tokens.`;
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
    const tx = await state.contract.claimStableDividends();
    await tx.wait();
    feedback(claimMessage, `Succès : transaction confirmée ${shortAddress(tx.hash)}.`);
    await refreshInvestor();
  } catch (error) {
    feedback(claimMessage, error.shortMessage || error.reason || "La réclamation a échoué.", true);
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
    targetAddress = ethers.getAddress(value.toLowerCase());
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
    const tx = await state.contract.setWhitelist(targetAddress, true);
    await tx.wait();
    feedback(whitelistMessage, `✓ ${shortAddress(targetAddress)} a été whitelisté. Transaction : ${shortAddress(tx.hash)}.`);
    walletInput.value = "";
  } catch (error) {
    const reason = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message;
    feedback(whitelistMessage, reason || "La whitelist a échoué : Owner requis.", true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Approuver l'adresse <span>→</span>";
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
    const tx = await state.contract.pause();
    await tx.wait();
    feedback(pauseMessage, `Contrat gelé on-chain. Transaction : ${shortAddress(tx.hash)}.`);
    pauseButton.textContent = "Contrat gelé ✓";
  } catch (error) {
    feedback(pauseMessage, error.shortMessage || error.reason || error.message || "Le gel a échoué.", true);
    pauseButton.disabled = false;
    pauseButton.textContent = "Urgence : Geler le contrat";
  }
});

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.contract) return feedback(recoveryMessage, "Connectez d’abord le portefeuille Owner.", true);
  if (!state.contract.emergencyRecoverTokens) return feedback(recoveryMessage, "Cette fonction sera disponible après le redeploiement du contrat renforcé.", true);
  let lostAddress;
  let newAddress;
  try {
    lostAddress = ethers.getAddress(lostWalletInput.value.trim().toLowerCase());
    newAddress = ethers.getAddress(newWalletInput.value.trim().toLowerCase());
  } catch {
    return feedback(recoveryMessage, "Les deux adresses doivent être valides.", true);
  }
  const submit = recoveryForm.querySelector("button");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Récupération on-chain...';
  try {
    const owner = await state.contract.owner();
    if (owner.toLowerCase() !== state.account.toLowerCase()) throw new Error(`Owner requis : ${shortAddress(owner)}`);
    const paused = await state.contract.paused();
    if (!paused) throw new Error("Le contrat doit être gelé avant une récupération d’urgence.");
    const tx = await state.contract.emergencyRecoverTokens(lostAddress, newAddress);
    await tx.wait();
    feedback(recoveryMessage, `Solde transféré vers ${shortAddress(newAddress)}. Transaction : ${shortAddress(tx.hash)}.`);
    lostWalletInput.value = "";
    newWalletInput.value = "";
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
loadMarketState();
