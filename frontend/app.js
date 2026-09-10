const state = {
  connected: false,
  dividend: 53550,
  whitelisted: [],
};

const connectButton = document.querySelector("#connectButton");
const walletNotice = document.querySelector("#walletNotice");
const walletAddress = document.querySelector("#walletAddress");
const tokenBalance = document.querySelector("#tokenBalance");
const nominalValue = document.querySelector("#nominalValue");
const kycStatus = document.querySelector("#kycStatus");
const dividendAmount = document.querySelector("#dividendAmount");
const claimDescription = document.querySelector("#claimDescription");
const claimButton = document.querySelector("#claimButton");
const claimMessage = document.querySelector("#claimMessage");

const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);

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

  walletAddress.textContent = "0xSOBK...73";
  tokenBalance.textContent = "100";
  nominalValue.textContent = "50 000 XAF";
  kycStatus.textContent = "✓ Vérifié";
  dividendAmount.textContent = formatNumber(state.dividend);
  claimDescription.textContent = "Rendement net disponible selon votre solde de 100 tokens.";
  claimButton.disabled = state.dividend === 0;
  walletNotice.innerHTML = "<span>✓</span><span>Portefeuille simulé connecté · réseau Arbitrum · données de démonstration.</span>";
}

connectButton.addEventListener("click", () => {
  state.connected = !state.connected;
  connectButton.textContent = state.connected ? "0xSOBK...73 · Connecté" : "Connecter le portefeuille";
  connectButton.classList.toggle("button-ghost", state.connected);
  connectButton.classList.toggle("button-primary", !state.connected);
  updateInvestorState();
});

claimButton.addEventListener("click", () => {
  if (!state.connected || state.dividend === 0) return;
  claimButton.disabled = true;
  claimButton.innerHTML = '<span class="loader"></span> Transaction en cours...';
  claimMessage.textContent = "Confirmation de la transaction sur Arbitrum...";
  claimMessage.classList.remove("error");

  window.setTimeout(() => {
    state.dividend = 0;
    claimButton.innerHTML = "Dividendes réclamés ✓";
    claimMessage.textContent = "Succès : 53 550 XAF ont été réclamés sur votre portefeuille simulé.";
    updateInvestorState();
    claimButton.disabled = true;
  }, 1500);
});

const whitelistForm = document.querySelector("#whitelistForm");
const walletInput = document.querySelector("#walletInput");
const whitelistMessage = document.querySelector("#whitelistMessage");

whitelistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = walletInput.value.trim();
  if (value.length < 6) {
    whitelistMessage.textContent = "Veuillez saisir une adresse ou un alias valide.";
    whitelistMessage.classList.add("error");
    return;
  }
  state.whitelisted.push(value);
  whitelistMessage.classList.remove("error");
  whitelistMessage.textContent = `✓ ${value} a été ajouté(e) à la liste blanche KYC simulée.`;
  walletInput.value = "";
});

const loaderStyle = document.createElement("style");
loaderStyle.textContent = ".loader{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(loaderStyle);

updateInvestorState();
