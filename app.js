// ===== State =====
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let spendingLimit = parseFloat(localStorage.getItem('spendingLimit')) || 0;
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
let chartInstance = null;

// ===== DOM References =====
const form           = document.getElementById('transaction-form');
const nameInput      = document.getElementById('item-name');
const amountInput    = document.getElementById('item-amount');
const categorySelect = document.getElementById('item-category');
const customCatRow   = document.getElementById('custom-category-row');
const customCatInput = document.getElementById('custom-cat-input');
const btnAddCat      = document.getElementById('btn-add-cat');
const txList         = document.getElementById('transaction-list');
const balanceEl      = document.getElementById('total-balance');
const txCountEl      = document.getElementById('tx-count');
const limitInput     = document.getElementById('limit-input');
const limitBanner    = document.getElementById('limit-banner');
const limitBannerMsg = document.getElementById('limit-banner-msg');
const sortSelect     = document.getElementById('sort-select');
const themeToggle    = document.getElementById('theme-toggle');
const summaryEl      = document.getElementById('monthly-summary');

// Error elements
const nameError     = document.getElementById('name-error');
const amountError   = document.getElementById('amount-error');
const catError      = document.getElementById('cat-error');

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '☀️ Light';
  } else {
    themeToggle.textContent = '🌙 Dark';
  }
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  themeToggle.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// ===== Custom Categories =====
function populateCategories() {
  // Keep default options, add custom
  const existing = Array.from(categorySelect.options).map(o => o.value);
  customCategories.forEach(cat => {
    if (!existing.includes(cat)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.insertBefore(opt, categorySelect.lastElementChild);
    }
  });
}

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'custom') {
    customCatRow.classList.add('show');
    customCatInput.focus();
  } else {
    customCatRow.classList.remove('show');
  }
});

btnAddCat.addEventListener('click', () => {
  const newCat = customCatInput.value.trim();
  if (!newCat) return;

  if (!customCategories.includes(newCat)) {
    customCategories.push(newCat);
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    const opt = document.createElement('option');
    opt.value = newCat;
    opt.textContent = newCat;
    categorySelect.insertBefore(opt, categorySelect.lastElementChild);
  }

  categorySelect.value = newCat;
  customCatRow.classList.remove('show');
  customCatInput.value = '';
});

// ===== Spending Limit =====
document.getElementById('btn-set-limit').addEventListener('click', () => {
  const val = parseFloat(limitInput.value);
  if (!isNaN(val) && val > 0) {
    spendingLimit = val;
    localStorage.setItem('spendingLimit', val);
    checkLimit();
  } else {
    spendingLimit = 0;
    localStorage.removeItem('spendingLimit');
    limitBanner.classList.remove('show');
  }
});

function checkLimit() {
  if (!spendingLimit) {
    limitBanner.classList.remove('show');
    return;
  }
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  if (total > spendingLimit) {
    limitBannerMsg.textContent =
      `⚠️ Total spending (Rp ${formatNumber(total)}) exceeds your limit (Rp ${formatNumber(spendingLimit)})!`;
    limitBanner.classList.add('show');
  } else {
    limitBanner.classList.remove('show');
  }
}

// ===== Validation =====
function validateForm() {
  let valid = true;

  // Name
  if (!nameInput.value.trim()) {
    nameInput.classList.add('error');
    nameError.classList.add('show');
    valid = false;
  } else {
    nameInput.classList.remove('error');
    nameError.classList.remove('show');
  }

  // Amount
  const amt = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amt) || amt <= 0) {
    amountInput.classList.add('error');
    amountError.classList.add('show');
    valid = false;
  } else {
    amountInput.classList.remove('error');
    amountError.classList.remove('show');
  }

  // Category
  if (!categorySelect.value || categorySelect.value === 'custom') {
    categorySelect.classList.add('error');
    catError.classList.add('show');
    valid = false;
  } else {
    categorySelect.classList.remove('error');
    catError.classList.remove('show');
  }

  return valid;
}

// ===== Add Transaction =====
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const tx = {
    id: Date.now(),
    name: nameInput.value.trim(),
    amount: parseFloat(amountInput.value),
    category: categorySelect.value,
    date: new Date().toISOString(),
  };

  transactions.unshift(tx);
  saveAndRender();
  form.reset();
  customCatRow.classList.remove('show');
});

// ===== Delete Transaction =====
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

// ===== Save & Render =====
function saveAndRender() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  renderBalance();
  renderList();
  renderChart();
  renderSummary();
  checkLimit();
}

// ===== Format Helpers =====
function formatNumber(n) {
  return n.toLocaleString('id-ID');
}

function formatCurrency(n) {
  return 'Rp ' + formatNumber(n);
}

// ===== Render Balance =====
function renderBalance() {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  balanceEl.textContent = formatCurrency(total);
  txCountEl.textContent = `${transactions.length} transaksi`;
}

// ===== Category CSS Class =====
function getCatClass(cat) {
  const map = { Food: 'cat-food', Transport: 'cat-transport', Fun: 'cat-fun' };
  return map[cat] || 'cat-custom';
}

// ===== Sort Transactions =====
function getSorted() {
  const mode = sortSelect.value;
  const list = [...transactions];
  if (mode === 'amount-asc')  return list.sort((a, b) => a.amount - b.amount);
  if (mode === 'amount-desc') return list.sort((a, b) => b.amount - a.amount);
  if (mode === 'cat-asc')     return list.sort((a, b) => a.category.localeCompare(b.category));
  if (mode === 'cat-desc')    return list.sort((a, b) => b.category.localeCompare(a.category));
  return list; // default: newest first (already sorted by unshift)
}

sortSelect.addEventListener('change', renderList);

// ===== Render Transaction List =====
function renderList() {
  const sorted = getSorted();

  if (sorted.length === 0) {
    txList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>Belum ada transaksi. Tambahkan pengeluaran pertamamu!</p>
      </div>`;
    return;
  }

  txList.innerHTML = sorted.map(tx => `
    <div class="transaction-item" data-id="${tx.id}">
      <div class="tx-info">
        <span class="tx-name">${escapeHtml(tx.name)}</span>
        <span class="tx-amount">${formatCurrency(tx.amount)}</span>
        <span class="tx-category ${getCatClass(tx.category)}">${escapeHtml(tx.category)}</span>
      </div>
      <button class="btn-delete" onclick="deleteTransaction(${tx.id})">Hapus</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Render Chart =====
function renderChart() {
  const ctx = document.getElementById('spending-chart').getContext('2d');
  const noData = document.getElementById('chart-no-data');
  const chartWrapper = document.getElementById('chart-wrapper');

  if (transactions.length === 0) {
    noData.style.display = 'block';
    chartWrapper.style.display = 'none';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  noData.style.display = 'none';
  chartWrapper.style.display = 'block';

  // Aggregate by category
  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);

  const palette = [
    '#14b8a6', '#7c3aed', '#f59e0b', '#ec4899',
    '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  ];
  const colors = labels.map((_, i) => palette[i % palette.length]);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'transparent',
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-secondary').trim() || '#94a3b8',
            font: { size: 11 },
            padding: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
}

// ===== Monthly Summary =====
function renderSummary() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const total = thisMonth.reduce((s, t) => s + t.amount, 0);
  const biggest = thisMonth.reduce((max, t) => t.amount > max ? t.amount : max, 0);
  const catCounts = {};
  thisMonth.forEach(t => catCounts[t.category] = (catCounts[t.category] || 0) + 1);
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  summaryEl.innerHTML = `
    <div class="summary-item">
      <div class="s-label">Bulan Ini</div>
      <div class="s-value">${formatCurrency(total)}</div>
    </div>
    <div class="summary-item">
      <div class="s-label">Transaksi</div>
      <div class="s-value">${thisMonth.length}</div>
    </div>
    <div class="summary-item">
      <div class="s-label">Terbesar</div>
      <div class="s-value">${biggest ? formatCurrency(biggest) : '-'}</div>
    </div>
    <div class="summary-item">
      <div class="s-label">Kategori Utama</div>
      <div class="s-value">${topCat}</div>
    </div>
  `;
}

// ===== Init =====
initTheme();
populateCategories();
if (spendingLimit) limitInput.value = spendingLimit;
saveAndRender();
