// ✅ YOUR EXACT FORM URL
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc85d9MBB0-2nQ-2yYNYzWhTbMs2_L_TdWJrEznTZpXrdpV0g/formResponse";

const form = document.getElementById("expenseForm");
const submitBtn = document.getElementById("submitBtn");
const modal = document.getElementById("successModal");
const fileInput = document.getElementById("receiptFile");
const fileNameDisplay = document.getElementById("fileName");
const syncBtn = document.getElementById("syncBtn");
const pendingCount = document.getElementById("pendingCount");
const statusText = document.getElementById("statusText");
const statusIndicator = document.getElementById("connectionStatus");

// --- 1. Init: Check LocalStorage for pending items ---
updateSyncUI();

// Default Date/Time
const now = new Date();
document.getElementById('date').valueAsDate = now;
document.getElementById('time').value = now.toTimeString().slice(0, 5);

// File Handler
let uploadedImageBase64 = null;
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    fileNameDisplay.innerHTML = `<i class="ph-fill ph-check-circle" style="color:#10b981;"></i> ${file.name.substring(0, 15)}...`;
    fileNameDisplay.style.color = "#fff";
    const reader = new FileReader();
    reader.onload = function(event) { uploadedImageBase64 = event.target.result; };
    reader.readAsDataURL(file);
  } else {
    fileNameDisplay.innerHTML = `Attach Photo`;
    fileNameDisplay.style.color = "";
    uploadedImageBase64 = null;
  }
});

// --- 2. Submit Handler (Smart) ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.classList.add("btn-loading");

  // Gather Data
  const rawData = {
    amount: document.getElementById("amount").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    category: document.getElementById("category").value,
    payment: document.getElementById("payment").value,
    necessity: document.getElementById("necessity").value,
    desc: document.getElementById("description").value,
    fileRef: fileInput.files[0] ? `File: ${fileInput.files[0].name}` : ""
  };

  // Prepare FormData for Google
  const formData = createGoogleFormData(rawData);

  try {
    // Attempt Online Send
    await fetch(FORM_URL, { method: "POST", mode: "no-cors", body: formData });
    showModal(true, rawData); // Success
  } catch (error) {
    // If Failed, Save to LocalStorage
    saveOffline(rawData);
    showModal(false, rawData); // Offline Success
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    updateSyncUI();
  }
});

// --- 3. Sync Function ---
async function syncData() {
  const offlineData = JSON.parse(localStorage.getItem("offlineExpenses") || "[]");
  if (offlineData.length === 0) return;

  syncBtn.innerHTML = `<div class="loader" style="width:14px;height:14px;border-width:2px;"></div>`;
  
  let successCount = 0;
  // Loop backwards so we can remove items safely
  for (let i = offlineData.length - 1; i >= 0; i--) {
    const entry = offlineData[i];
    const formData = createGoogleFormData(entry);
    
    try {
      await fetch(FORM_URL, { method: "POST", mode: "no-cors", body: formData });
      offlineData.splice(i, 1); // Remove from array if success
      successCount++;
    } catch (err) {
      console.log("Still offline, skipping...");
    }
  }

  // Save remaining items back to local storage
  localStorage.setItem("offlineExpenses", JSON.stringify(offlineData));
  
  if (successCount > 0) alert(`Synced ${successCount} transactions!`);
  updateSyncUI();
}

// --- Helper: Map Data to IDs ---
function createGoogleFormData(data) {
  const [year, month, day] = data.date.split("-");
  const [hour, minute] = data.time.split(":");
  const formData = new FormData();
  
  formData.append("entry.1468814675", data.amount);
  formData.append("entry.1622584561", data.category);
  formData.append("entry.659650888", data.payment);
  formData.append("entry.1784605128", data.necessity);
  formData.append("entry.1022929564", data.desc);
  formData.append("entry.1061529182", data.fileRef);
  formData.append("entry.363553323_year", year);
  formData.append("entry.363553323_month", month);
  formData.append("entry.363553323_day", day);
  formData.append("entry.1806288007_hour", hour);
  formData.append("entry.1806288007_minute", minute);
  
  return formData;
}

// --- Helper: Save Offline ---
function saveOffline(data) {
  const existing = JSON.parse(localStorage.getItem("offlineExpenses") || "[]");
  existing.push(data);
  localStorage.setItem("offlineExpenses", JSON.stringify(existing));
}

// --- UI Updates ---
function updateSyncUI() {
  const count = JSON.parse(localStorage.getItem("offlineExpenses") || "[]").length;
  
  if (count > 0) {
    syncBtn.style.display = "flex";
    syncBtn.innerHTML = `<i class="ph-bold ph-arrows-clockwise"></i> Sync (${count})`;
    pendingCount.textContent = count;
  } else {
    syncBtn.style.display = "none";
  }

  // Check connection
  if (!navigator.onLine) {
    statusIndicator.classList.add("offline");
    statusText.textContent = "Offline";
  } else {
    statusIndicator.classList.remove("offline");
    statusText.textContent = "Online";
  }
}

function showModal(isOnline, data) {
  // Update Modal Text based on status
  const title = document.getElementById("modalTitle");
  const sub = document.getElementById("modalSub");
  const icon = document.getElementById("modalIcon");
  
  if (isOnline) {
    title.textContent = "Saved!";
    sub.textContent = "Synced to Cloud";
    icon.classList.remove("orange");
  } else {
    title.textContent = "Saved Offline";
    sub.textContent = "Will sync when online";
    icon.classList.add("orange");
  }

  // Populate Bill
  document.getElementById("billAmount").textContent = "₹" + data.amount;
  document.getElementById("billCategory").textContent = data.category;
  document.getElementById("billPayment").textContent = data.payment;
  document.getElementById("billDesc").textContent = data.desc || "";
  document.getElementById("billDate").textContent = data.date;

  const billImgContainer = document.getElementById("billImageContainer");
  const billImg = document.getElementById("billImagePreview");
  
  // Show image if it exists in current session
  if (uploadedImageBase64) {
    billImg.src = uploadedImageBase64;
    billImgContainer.style.display = "block";
  } else {
    billImgContainer.style.display = "none";
  }

  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  form.reset();
  fileNameDisplay.innerHTML = "Attach Photo";
  uploadedImageBase64 = null;
  document.getElementById("billImageContainer").style.display = "none";
  
  const now = new Date();
  document.getElementById('date').valueAsDate = now;
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
}

// Listen for network changes
window.addEventListener('online', updateSyncUI);
window.addEventListener('offline', updateSyncUI);