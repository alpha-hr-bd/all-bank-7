
const banks = [
  "Dutch-Bangla Bank",
  "Eastern Bank (EBL)",
  "BRAC Bank",
  "The City Bank",
  "IFIC Bank",
  "Prime Bank",
  "Bank Asia",
  "Islami Bank Bangladesh",
  "Mutual Trust Bank",
  "Uttara Bank"
];

const $ = id => document.getElementById(id);
const read = key => JSON.parse(localStorage.getItem(key) || "[]");
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

let currentUser = JSON.parse(sessionStorage.getItem("ab7_user") || "null");
let selectedApplication = null;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function showPage(page) {
  if (["dashboard", "apply", "payment"].includes(page) && !currentUser) {
    showToast("Please login first.");
    page = "login";
  }

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(page).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "dashboard") renderDashboard();
  if (page === "apply") populateBanks();
}

function populateBanks() {
  $("bankSelect").innerHTML = banks.map((bank, i) =>
    `<option value="${bank}">${i + 1}. ${bank} — Demo</option>`
  ).join("");
}

function renderBanks() {
  $("bankGrid").innerHTML = banks.map((bank, i) => `
    <article class="bank-card" onclick="chooseBank(${i})">
      <div class="bank-logo">${String(i + 1).padStart(2, "0")}</div>
      <h3>${bank}</h3>
      <p>Illustrative bank listing · Unofficial</p>
      <small>DEMO ONLY</small>
    </article>
  `).join("");
}

function chooseBank(index) {
  if (!currentUser) {
    showToast("Login to try a demo application.");
    showPage("login");
    return;
  }
  showPage("apply");
  $("bankSelect").value = banks[index];
}

function updateNavigation() {
  $("loginBtn").classList.toggle("hidden", !!currentUser);
  $("registerBtn").classList.toggle("hidden", !!currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);
}

function logout() {
  sessionStorage.removeItem("ab7_user");
  currentUser = null;
  updateNavigation();
  showToast("Logged out.");
  showPage("home");
}

// Demo-only password hashing. Requires HTTPS (GitHub Pages) or localhost.
async function hashPassword(password) {
  if (!crypto.subtle) throw new Error("Use GitHub Pages or localhost for this demo.");
  const bytes = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

$("registerForm").addEventListener("submit", async e => {
  e.preventDefault();

  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim().toLowerCase();
  const phone = $("regPhone").value.trim();
  const password = $("regPassword").value;

  if (!/^01[0-9]{9}$/.test(phone)) {
    showToast("Enter a valid 11-digit demo phone number.");
    return;
  }

  const users = read("ab7_users");
  if (users.some(u => u.email === email)) {
    showToast("This email is already registered.");
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    users.push({ name, email, phone, passwordHash });
    save("ab7_users", users);

    currentUser = { name, email, phone };
    sessionStorage.setItem("ab7_user", JSON.stringify(currentUser));
    updateNavigation();
    e.target.reset();
    showToast("Demo account created!");
    showPage("dashboard");
  } catch (err) {
    showToast(err.message);
  }
});

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  try {
    const passwordHash = await hashPassword(password);
    const user = read("ab7_users").find(
      u => u.email === email && u.passwordHash === passwordHash
    );

    if (!user) {
      showToast("Incorrect email or password.");
      return;
    }

    currentUser = {
      name: user.name,
      email: user.email,
      phone: user.phone
    };

    sessionStorage.setItem("ab7_user", JSON.stringify(currentUser));
    updateNavigation();
    e.target.reset();
    showToast("Welcome back!");
    showPage("dashboard");
  } catch (err) {
    showToast(err.message);
  }
});

function myApplications() {
  return read("ab7_apps").filter(a => a.email === currentUser?.email);
}

function renderDashboard() {
  if (!currentUser) return;

  $("userName").textContent = currentUser.name;

  const apps = myApplications();
  $("totalApps").textContent = apps.length;
  $("pendingApps").textContent = apps.filter(
    a => a.status === "Pending" || a.status === "Under Review"
  ).length;

  const approvedTotal = apps
    .filter(a => a.status === "Approved")
    .reduce((sum, a) => sum + Number(a.amount), 0);

  $("virtualAmount").textContent = "৳" + approvedTotal.toLocaleString("en-BD");

  $("applicationList").innerHTML = apps.length
    ? [...apps].reverse().map(a => `
      <article class="application">
        <div>
          <h3>${a.bank}</h3>
          <p>ID: ${a.id} · ৳${Number(a.amount).toLocaleString("en-BD")}</p>
          <p>${a.date} · ${a.purpose}</p>
        </div>
        <div>
          <span class="status ${a.status}">${a.status}</span>
          <button class="btn light" onclick="openPayment('${a.id}')">Demo Reference</button>
        </div>
      </article>
    `).join("")
    : `<p class="muted">No applications yet. Start with your first demo application.</p>`;
}

$("nidFront").addEventListener("change", e => previewImage(e, "frontPreview"));
$("nidBack").addEventListener("change", e => previewImage(e, "backPreview"));

function previewImage(event, targetId) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
    event.target.value = "";
    showToast("Choose an image under 2MB.");
    return;
  }

  const img = $(targetId);
  img.src = URL.createObjectURL(file);
  img.classList.remove("hidden");
}

$("loanForm").addEventListener("submit", e => {
  e.preventDefault();

  const amount = Number($("loanAmount").value);
  if (amount < 5000 || amount > 500000) {
    showToast("Enter an amount between ৳5,000 and ৳5,00,000.");
    return;
  }

  const app = {
    id: "AB7-" + Date.now().toString().slice(-8),
    email: currentUser.email,
    name: currentUser.name,
    bank: $("bankSelect").value,
    amount,
    purpose: $("loanPurpose").value,
    identity: $("demoIdentity").value.trim(),
    status: "Pending",
    date: new Date().toLocaleDateString(),
    paymentReference: ""
  };

  const apps = read("ab7_apps");
  apps.push(app);
  save("ab7_apps", apps);

  e.target.reset();
  $("frontPreview").classList.add("hidden");
  $("backPreview").classList.add("hidden");

  showToast("Demo application submitted!");
  showPage("dashboard");
});

function openPayment(id) {
  const app = myApplications().find(a => a.id === id);
  if (!app) return;

  selectedApplication = app.id;
  $("paymentAppId").textContent = app.id;
  $("paymentAmount").textContent = "৳" + Number(app.amount).toLocaleString("en-BD");
  $("trxId").value = "";
  showPage("payment");
}

$("paymentForm").addEventListener("submit", e => {
  e.preventDefault();

  const reference = $("trxId").value.trim();
  if (!/^DEMO-[A-Z0-9-]{5,30}$/i.test(reference)) {
    showToast("Use a demo reference like DEMO-TRX-12345.");
    return;
  }

  const apps = read("ab7_apps");
  const app = apps.find(a =>
    a.id === selectedApplication && a.email === currentUser?.email
  );

  if (!app) {
    showToast("Application not found.");
    return;
  }

  app.paymentReference = reference;
  app.paymentMethod = $("paymentMethod").value;
  app.paymentStatus = "Demo Reference Submitted";

  save("ab7_apps", apps);
  showToast("Demo reference saved!");
  showPage("dashboard");
});

function trackApplication() {
  const id = $("trackId").value.trim();
  const app = read("ab7_apps").find(a =>
    a.id === id && a.email === currentUser?.email
  );

  $("trackingResult").innerHTML = app
    ? `<div class="application">
        <div><h3>${app.bank}</h3>
        <p>Application: ${app.id}</p>
        <p>Amount: ৳${Number(app.amount).toLocaleString("en-BD")}</p></div>
        <span class="status ${app.status}">${app.status}</span>
      </div>`
    : `<p class="notice">No matching application found in your demo account.</p>`;
}

renderBanks();
populateBanks();
updateNavigation();
if (currentUser) showPage("home");
