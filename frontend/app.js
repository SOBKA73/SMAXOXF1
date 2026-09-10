const DEMO_WALLET = "0x7fc05911b8eE165dA41F60fB90a971af14B6f7C5";
const state = {
  connected: false,
  connecting: false,
  claiming: false,
  dividend: 53550,
  whitelisted: [],
};

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

function updateInvestorState() {
  if (!state.connected) {
    walletAddress.textContent = "Portefeuille non connecté";
    tokenBalance.textContent = "—";
    nominalValue.textContent = "— XAF";
    kycStatus.textContent = "En attente";
    dividendAmount.textContent = "—";
    claimDescription.textContent = "Connectez votre portefeuille pour consulter vos dividendes.";
    claimButton.disabled = true;
    walletNotice.innerHTML = "<span>◎</span><span>Connectez votre portefeuille pour débloquer votre espace investisseur.</span>";
    return;
  }

  walletAddress.textContent = shortAddress(DEMO_WALLET);
  tokenBalance.textContent = "100";
  nominalValue.textContent = "50 000 XAF";
  kycStatus.textContent = "✓ Vérifié";
  dividendAmount.textContent = formatNumber(state.dividend);
  claimDescription.textContent = "Rendement net disponible selon votre solde de 100 tokens.";
  claimButton.disabled = state.dividend === 0 || state.claiming;
  walletNotice.innerHTML = "<span>✓</span><span>Portefeuille simulé connecté · réseau Arbitrum Sepolia · démonstration.</span>";
}

function setConnectingState() {
  state.connecting = true;
  connectButton.disabled = true;
  connectButton.innerHTML = '<span class="loader"></span> Connexion à MetaMask...';
  feedback(claimMessage, "Initialisation de la session Ethers.js simulée...");
}

connectButton.addEventListener("click", () => {
  if (state.connected || state.connecting) return;
  setConnectingState();
  window.setTimeout(() => {
    state.connected = true;
    state.connecting = false;
    connectButton.disabled = false;
    connectButton.textContent = `${shortAddress(DEMO_WALLET)} · Connecté`;
    connectButton.classList.replace("button-primary", "button-ghost");
    feedback(claimMessage, "Portefeuille connecté · réseau Arbitrum Sepolia simulé.");
    updateInvestorState();
  }, 1000);
});

claimButton.addEventListener("click", () => {
  if (!state.connected || state.dividend === 0 || state.claiming) return;
  state.claiming = true;
  claimButton.disabled = true;
  claimButton.innerHTML = '<span class="loader"></span> Confirmation blockchain...';
  feedback(claimMessage, "Transaction en cours · validation sur Arbitrum Sepolia...");

  window.setTimeout(() => {
    state.dividend = 0;
    state.claiming = false;
    claimButton.innerHTML = "Dividendes réclamés ✓";
    feedback(claimMessage, "Dividendes réclamés avec succès sur Arbitrum !");
    updateInvestorState();
    claimButton.disabled = true;
    showToast("Dividendes réclamés avec succès sur Arbitrum !");
  }, 1500);
});

whitelistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = walletInput.value.trim();
  if (value.length < 6) {
    feedback(whitelistMessage, "Veuillez saisir une adresse ou un alias valide.", true);
    return;
  }
  whitelistMessage.classList.remove("error");
  whitelistMessage.textContent = "Validation cryptographique en cours...";
  const submit = whitelistForm.querySelector("button");
  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Validation KYC...';

  window.setTimeout(() => {
    state.whitelisted.push(value);
    submit.disabled = false;
    submit.innerHTML = "Approuver l'adresse <span>→</span>";
    whitelistMessage.textContent = "✓ Adresse validée sur la liste blanche ARCEP Tchad";
    walletInput.value = "";
    showToast("Adresse validée sur la liste blanche ARCEP Tchad");
  }, 900);
});

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "demo-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.classList.add("visible"), 10);
  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 3600);
}

const demoStyle = document.createElement("style");
demoStyle.textContent = `
  .loader{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .demo-toast{position:fixed;right:24px;bottom:24px;z-index:20;max-width:360px;padding:16px 20px;border:1px solid rgba(167,111,255,.45);border-radius:14px;background:rgba(23,20,50,.96);box-shadow:0 18px 50px rgba(0,0,0,.35);color:#fff;font-weight:600;opacity:0;transform:translateY(14px);transition:opacity .3s,transform .3s}
  .demo-toast.visible{opacity:1;transform:translateY(0)}
`;
document.head.appendChild(demoStyle);

// Simulation contrôlée d'un provider EVM pour la démonstration INSEEC.
window.ethereum = window.ethereum || {
  isDemoProvider: true,
  request: async ({ method }) => {
    if (method === "eth_requestAccounts") return [DEMO_WALLET];
    if (method === "eth_chainId") return "0x66eee";
    throw new Error(`Méthode simulée non supportée: ${method}`);
  },
};

updateInvestorState();
