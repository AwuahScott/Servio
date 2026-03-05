// ============================================================
// SERVIO — main.js  (clean version, no duplicates)
// ============================================================

// ============================================================
// 1. LOCATION DATA
// ============================================================
const locationData = {
  bono: [
    { value: "sunyani", label: "Sunyani Municipal" },
    { value: "berekum", label: "Berekum Municipal" },
    { value: "dormaa", label: "Dormaa Municipal" },
    { value: "jaman-north", label: "Jaman North" },
    { value: "jaman-south", label: "Jaman South" },
    { value: "banda", label: "Banda" },
    { value: "tain", label: "Tain" },
    { value: "wenchi", label: "Wenchi Municipal" },
  ],
  "bono-east": [
    { value: "techiman", label: "Techiman Municipal" },
    { value: "kintampo", label: "Kintampo Municipal" },
    { value: "atebubu", label: "Atebubu-Amantin" },
    { value: "nkoranza", label: "Nkoranza" },
    { value: "pru", label: "Pru East & West" },
    { value: "sene", label: "Sene East & West" },
  ],
};

// ============================================================
// 2. GET ELEMENTS
// ============================================================
const serviceInput = document.getElementById("serviceInput");
const regionSelect = document.getElementById("regionSelect");
const districtSelect = document.getElementById("districtSelect");
const searchBtn = document.getElementById("searchBtn");
const providersGrid = document.getElementById("providersGrid");
const noResults = document.getElementById("noResults");
const resultCount = document.getElementById("resultCount");
const categoriesGrid = document.getElementById("categoriesGrid");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const joinForm = document.getElementById("joinForm");
const toast = document.getElementById("toast");
const totalStat = document.getElementById("totalProviders");

// ============================================================
// 3. PAGINATION STATE
// Saved so Previous / Next buttons know what to reload
// ============================================================
let currentPage = 1;
let currentFilter = {};

// ============================================================
// 4. CASCADING DROPDOWN
// Region change → auto-fill District options
// ============================================================
regionSelect.addEventListener("change", function () {
  const region = this.value;
  districtSelect.innerHTML = '<option value="">All Districts</option>';
  if (!region) return;

  const districts = locationData[region] || [];
  districts.forEach(function (d) {
    const opt = document.createElement("option");
    opt.value = d.value;
    opt.textContent = d.label;
    districtSelect.appendChild(opt);
  });
});

// ============================================================
// 5. BUILD ONE PROVIDER CARD
// Returns HTML string. Handles photo OR initials avatar.
// ============================================================
function buildCard(p) {
  // Stars
  const starCount = p.stars || 5;
  const stars = "★".repeat(starCount) + "☆".repeat(5 - starCount);

  // Tags — p.tags comes from Django as an array []
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const tagsHTML = tags.map((t) => `<span class="tag">${t}</span>`).join("");

  // Verified badge
  const badge = p.verified
    ? `<span class="badge badge-verified">✅ Verified</span>`
    : "";

  // Avatar — real photo if uploaded, green initials circle if not
  const avatarInner = p.photo
    ? `<img src="${p.photo}" alt="${p.name}"
            style="width:56px;height:56px;border-radius:50%;
                   object-fit:cover;display:block;">`
    : p.initials || "?";

  const avatarStyle = p.photo
    ? "background:transparent;padding:0;overflow:hidden;"
    : "";

  return `
    <div class="provider-card fade-up">
      <div class="card-header">
        <div class="avatar" style="${avatarStyle}">
          ${avatarInner}
        </div>
        <div>
          <div class="card-name">${p.name}</div>
          <div class="card-service">${p.service}</div>
          <div style="margin-top:6px;display:flex;gap:6px;
                      flex-wrap:wrap;align-items:center;">
            ${badge}
            <span class="stars">${stars}</span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-location">📍 ${p.town}</div>
        <p class="card-desc">${p.description || ""}</p>
        <div class="card-tags">${tagsHTML}</div>
        <div class="card-footer">
          <a href="https://wa.me/${p.whatsapp || p.phone}" target="_blank">
            <button class="btn btn-whatsapp">💬 WhatsApp</button>
          </a>
          <a href="tel:${p.phone}">
            <button class="btn btn-call">📞 Call</button>
          </a>
        </div>
      </div>
    </div>`;
}

// ============================================================
// 6. DISPLAY PROVIDER CARDS ON SCREEN
// Clears old cards, shows new list or no-results message
// ============================================================
function displayProviders(list) {
  // Remove old cards
  providersGrid.querySelectorAll(".provider-card").forEach((c) => c.remove());

  if (list.length === 0) {
    resultCount.textContent = "No providers found";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";
  resultCount.textContent = `${list.length} provider${list.length !== 1 ? "s" : ""} found`;

  list.forEach((p) => {
    noResults.insertAdjacentHTML("beforebegin", buildCard(p));
  });
}

// ============================================================
// 7. UPDATE CATEGORY COUNTS
// Shows how many providers are in each category icon card
// ============================================================
function updateCategoryCounts(list) {
  // Reset everything to 0 first
  document.querySelectorAll(".cat-count").forEach((el) => {
    el.textContent = "0 providers";
  });

  if (!list || list.length === 0) return;

  const counts = {};
  list.forEach((p) => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });

  Object.keys(counts).forEach((cat) => {
    const el = document.getElementById("count-" + cat);
    if (el) {
      el.textContent =
        counts[cat] + " provider" + (counts[cat] !== 1 ? "s" : "");
    }
  });

  const allEl = document.getElementById("count-all");
  if (allEl) allEl.textContent = list.length + " providers";
}

// ============================================================
// 8. RENDER PAGINATION BUTTONS
// Previous | 1 | 2 | 3 | Next — only when more than 1 page
// ============================================================
function renderPagination(data) {
  // Remove old pagination
  const old = document.getElementById("pagination");
  if (old) old.remove();

  // No need for pagination if only 1 page
  if (!data.total_pages || data.total_pages <= 1) return;

  const wrap = document.createElement("div");
  wrap.id = "pagination";
  wrap.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 40px;
    padding: 20px 0;
  `;

  // ── Previous ────────────────────────────────────────────
  if (data.has_previous) {
    const btn = document.createElement("button");
    btn.textContent = "← Previous";
    btn.style.cssText = `
      padding:10px 22px; border-radius:8px;
      font-family:'Sora',sans-serif; font-size:14px; font-weight:700;
      cursor:pointer; border:2px solid #1a7a4a;
      background:white; color:#1a7a4a; transition:all .2s;
    `;
    btn.addEventListener("click", () => {
      loadProviders(currentFilter, currentPage - 1);
      document
        .getElementById("providers")
        .scrollIntoView({ behavior: "smooth" });
    });
    wrap.appendChild(btn);
  }

  // ── Page number buttons ──────────────────────────────────
  for (let i = 1; i <= data.total_pages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    const active = i === data.current_page;
    btn.style.cssText = `
      width:40px; height:40px; border-radius:8px;
      font-family:'Sora',sans-serif; font-size:14px; font-weight:700;
      cursor:${active ? "default" : "pointer"};
      border:2px solid ${active ? "#1a7a4a" : "#d4e6da"};
      background:${active ? "#1a7a4a" : "white"};
      color:${active ? "white" : "#4a5e51"};
    `;
    if (!active) {
      const pageNum = i; // capture for closure
      btn.addEventListener("click", () => {
        loadProviders(currentFilter, pageNum);
        document
          .getElementById("providers")
          .scrollIntoView({ behavior: "smooth" });
      });
    }
    wrap.appendChild(btn);
  }

  // ── Next ─────────────────────────────────────────────────
  if (data.has_next) {
    const btn = document.createElement("button");
    btn.textContent = "Next →";
    btn.style.cssText = `
      padding:10px 22px; border-radius:8px;
      font-family:'Sora',sans-serif; font-size:14px; font-weight:700;
      cursor:pointer; border:2px solid #1a7a4a;
      background:#1a7a4a; color:white; transition:all .2s;
    `;
    btn.addEventListener("click", () => {
      loadProviders(currentFilter, currentPage + 1);
      document
        .getElementById("providers")
        .scrollIntoView({ behavior: "smooth" });
    });
    wrap.appendChild(btn);
  }

  // ── Info text ────────────────────────────────────────────
  const info = document.createElement("div");
  info.style.cssText = `
    width:100%; text-align:center; font-size:13px;
    color:#4a5e51; font-family:'Sora',sans-serif; margin-top:4px;
  `;
  info.textContent = `Page ${data.current_page} of ${data.total_pages} — ${data.total} providers total`;
  wrap.appendChild(info);

  providersGrid.insertAdjacentElement("afterend", wrap);
}

// ============================================================
// 9. LOAD PROVIDERS FROM DJANGO  ← THE ONE MASTER FUNCTION
// Every search, filter, category click and pagination calls this.
// No other fetch function exists anywhere in this file.
// ============================================================
async function loadProviders(filter = {}, page = 1) {
  // Save state for pagination buttons
  currentFilter = filter;
  currentPage = page;

  // Build query string from filter object
  const params = new URLSearchParams();
  if (filter.service) params.append("search", filter.service);
  if (filter.region) params.append("region", filter.region);
  if (filter.district) params.append("district", filter.district);
  if (filter.category && filter.category !== "all")
    params.append("category", filter.category);
  params.append("page", page);

  try {
    const response = await fetch("/api/providers/?" + params.toString());
    const data = await response.json();

    displayProviders(data.providers);
    updateCategoryCounts(data.providers);
    renderPagination(data);
    animateCounter(totalStat, data.total);
  } catch (err) {
    console.error("Could not load providers:", err);
    resultCount.textContent = "Could not load. Please refresh the page.";
  }
}

// ============================================================
// 10. SEARCH BUTTON
// ============================================================
searchBtn.addEventListener("click", function () {
  loadProviders(
    {
      service: serviceInput.value.trim(),
      region: regionSelect.value,
      district: districtSelect.value,
    },
    1,
  );
  document.getElementById("providers").scrollIntoView({ behavior: "smooth" });
});

// Press Enter in search input
serviceInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") searchBtn.click();
});

// Live search as user types
serviceInput.addEventListener("input", function () {
  loadProviders(
    {
      service: this.value.trim(),
      region: regionSelect.value,
      district: districtSelect.value,
    },
    1,
  );
});

// ============================================================
// 11. CATEGORY CARD CLICKS
// ============================================================
categoriesGrid.addEventListener("click", function (e) {
  const card = e.target.closest(".category-card");
  if (!card) return;

  // Highlight clicked card, remove from others
  document
    .querySelectorAll(".category-card")
    .forEach((c) => c.classList.remove("active"));
  card.classList.add("active");

  // data-category="electrical" in HTML → card.dataset.category
  loadProviders({ category: card.dataset.category }, 1);

  document.getElementById("providers").scrollIntoView({ behavior: "smooth" });
});

// ============================================================
// 12. HAMBURGER MENU (Mobile)
// ============================================================
hamburger.addEventListener("click", function () {
  navLinks.classList.toggle("open");
});

navLinks.addEventListener("click", function (e) {
  if (e.target.tagName === "A" || e.target.tagName === "BUTTON") {
    navLinks.classList.remove("open");
  }
});

// ============================================================
// 13. TOAST NOTIFICATION
// ============================================================
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ============================================================
// 14. JOIN FORM SUBMIT
// Sends provider registration request to Django
// ============================================================
joinForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("joinName").value.trim();
  const phone = document.getElementById("joinPhone").value.trim();
  const service = document.getElementById("joinService").value.trim();
  const region = document.getElementById("joinRegion").value.trim();
  const town = document.getElementById("joinTown").value.trim();

  if (!name || !phone || !service) {
    showToast("❌ Please fill in name, phone and service");
    return;
  }

  const btn = joinForm.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ Submitting...";
  btn.disabled = true;

  try {
    const response = await fetch("/api/join/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, service, region, town }),
    });

    const data = await response.json();

    if (data.success) {
      showToast("✅ " + data.message);
      joinForm.reset();
    } else {
      showToast("❌ " + data.message);
    }
  } catch (err) {
    showToast("❌ Could not connect. Check your internet.");
    console.error(err);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// ============================================================
// 15. ANIMATED COUNTER
// Counts up from 0 to target number smoothly on page load
// ============================================================
function animateCounter(element, target, duration = 1200) {
  if (!element || !target) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start);
    }
  }, 16);
}

// ============================================================
// 16. INIT — runs once when the page finishes loading
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  loadProviders({}, 1);
});
