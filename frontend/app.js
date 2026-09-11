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
const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);
const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function feedback(target, text, error = false) {
  target.textContent = text;
  target.classList.toggle("error", error);
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
  if (!ethers.isAddress(value)) return feedback(whitelistMessage, "Saisissez une adresse Ethereum valide.", true);
  const submit = whitelistForm.querySelector("button");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Validation on-chain...';
  try {
    const tx = await state.contract.setWhitelist(value, true);
    await tx.wait();
    feedback(whitelistMessage, `✓ ${shortAddress(value)} a été whitelisté. Transaction : ${shortAddress(tx.hash)}.`);
    walletInput.value = "";
  } catch (error) {
    feedback(whitelistMessage, error.shortMessage || error.reason || "La whitelist a échoué : Owner requis.", true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Approuver l'adresse <span>→</span>";
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
