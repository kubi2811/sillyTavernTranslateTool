// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const fileOverview = document.getElementById('file-overview');
const emptyState = document.getElementById('empty-state');
const loadedFileName = document.getElementById('loaded-file-name');
const loadedFileSize = document.getElementById('loaded-file-size');
const loadedEntriesCount = document.getElementById('loaded-entries-count');
const loadedFileDescription = document.getElementById('loaded-file-description');
const statIssuesCount = document.getElementById('stat-issues-count');
const groupDistribution = document.getElementById('group-distribution');
const aiProgressBar = document.getElementById('ai-progress-bar');
const aiProgressText = document.getElementById('ai-progress-text');
const btnRunHeuristic = document.getElementById('btn-run-heuristic');
const btnRunAi = document.getElementById('btn-run-ai');
const btnFixAll = document.getElementById('btn-fix-all');
const btnDownload = document.getElementById('btn-download');
const consoleLogs = document.getElementById('console-logs');
const consoleBody = document.getElementById('console-body');
const btnClearLogs = document.getElementById('btn-clear-logs');
const entriesSection = document.getElementById('entries-section');
const entriesTableBody = document.getElementById('entries-table-body');
const filterTabs = document.querySelectorAll('.filter-tab');
const countAll = document.getElementById('count-all');
const countMismatched = document.getElementById('count-mismatched');
const countCorrect = document.getElementById('count-correct');
const apiKeyInput = document.getElementById('api-key');
const toggleApiKeyBtn = document.getElementById('toggle-api-key');
const apiModelSelect = document.getElementById('api-model');
const apiProviderSelect = document.getElementById('api-provider');
const apiUrlInput = document.getElementById('api-url');
const btnValidateKey = document.getElementById('btn-validate-key');
const validationStatusIndicator = document.getElementById('validation-status-indicator');
const customModelInput = document.getElementById('custom-model');
const customModelGroup = document.getElementById('custom-model-group');

// Sample buttons
const btnLoadSampleCard = document.getElementById('btn-load-sample-card');
const btnLoadSampleLorebook = document.getElementById('btn-load-sample-lorebook');

// Rules Sidebar Collapse
const rulesToggle = document.getElementById('rules-toggle');
const sidebarSectionCollapsible = document.querySelector('.sidebar-section.collapsible');
rulesToggle.addEventListener('click', () => {
  sidebarSectionCollapsible.classList.toggle('collapsed');
});

// Modal Elements
const entryModal = document.getElementById('entry-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalComment = document.getElementById('modal-comment');
const modalKeys = document.getElementById('modal-keys');
const modalContent = document.getElementById('modal-content');
const modalAssignedGroup = document.getElementById('modal-assigned-group');
const modalAiExplanation = document.getElementById('modal-ai-explanation');

// App State
let activeFile = {
  name: '',
  size: 0,
  type: '', // 'card' or 'lorebook'
  rawJson: null,
  entries: [] // Normalized entry objects
};

let currentFilter = 'all';
let editingEntryUid = null;

// Definition of target rules for each group
const GROUP_RULES = {
  1: {
    name: 'Hệ Thống Sức Mạnh Cốt Lõi',
    constant: true,
    positionName: '@D System',
    card: { position: 'after_char', extPosition: 4, depth: 0, role: 0, order: 900 },
    lorebook: { position: 4, depth: 0, role: 0, order: 900 }
  },
  2: {
    name: 'Thế Giới Quan & Quy Luật Tự Nhiên',
    constant: true, // Strategy is Constant/Normal, default to Constant = true for rules, but we accept either if correct
    positionName: '@D System',
    card: { position: 'after_char', extPosition: 4, depth: 4, role: 0, order: 800 },
    lorebook: { position: 4, depth: 4, role: 0, order: 800 }
  },
  3: {
    name: 'Nhân Vật',
    constant: false,
    positionName: 'Before Character',
    card: { position: 'before_char', extPosition: 0, depth: 4, role: null, order: 200 }, // depth is default 4 in ST
    lorebook: { position: 0, depth: 4, role: null, order: 200 }
  },
  4: {
    name: 'Phe Phái, Tổ Chức & Tôn Giáo',
    constant: false,
    positionName: 'Before Character',
    card: { position: 'before_char', extPosition: 0, depth: 4, role: null, order: 150 },
    lorebook: { position: 0, depth: 4, role: null, order: 150 }
  },
  5: {
    name: 'Địa Điểm & Khu Vực',
    constant: false,
    positionName: 'Before Character',
    card: { position: 'before_char', extPosition: 0, depth: 4, role: null, order: 100 },
    lorebook: { position: 0, depth: 4, role: null, order: 100 }
  }
};

// Function to update placeholder dynamically
function updateApiUrlPlaceholder() {
  const provider = apiProviderSelect.value;
  if (provider === 'gemini') {
    apiUrlInput.placeholder = 'https://generativelanguage.googleapis.com';
  } else {
    apiUrlInput.placeholder = 'https://api.openai.com/v1';
  }
}

// Function to update custom model input visibility
function updateModelInputVisibility() {
  if (apiModelSelect.value === 'custom') {
    customModelGroup.classList.remove('hidden');
  } else {
    customModelGroup.classList.add('hidden');
  }
}

// Initialize API Key, Base URL, Model & Custom Model from local storage
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('st_opt_api_key');
  if (savedKey) apiKeyInput.value = savedKey;

  const savedModel = localStorage.getItem('st_opt_model');
  if (savedModel) apiModelSelect.value = savedModel;

  const savedProvider = localStorage.getItem('st_opt_provider');
  if (savedProvider) apiProviderSelect.value = savedProvider;

  const savedUrl = localStorage.getItem('st_opt_api_url');
  if (savedUrl) apiUrlInput.value = savedUrl;

  const savedCustomModel = localStorage.getItem('st_opt_custom_model');
  if (savedCustomModel) customModelInput.value = savedCustomModel;

  updateApiUrlPlaceholder();
  updateModelInputVisibility();
});

// Save settings to Local Storage when changed
apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('st_opt_api_key', apiKeyInput.value);
});
apiModelSelect.addEventListener('change', () => {
  localStorage.setItem('st_opt_model', apiModelSelect.value);
  updateModelInputVisibility();
});
apiProviderSelect.addEventListener('change', () => {
  localStorage.setItem('st_opt_provider', apiProviderSelect.value);
  updateApiUrlPlaceholder();
  validationStatusIndicator.textContent = ''; // Clear status on provider change
});
apiUrlInput.addEventListener('change', () => {
  localStorage.setItem('st_opt_api_url', apiUrlInput.value.trim());
});
customModelInput.addEventListener('change', () => {
  localStorage.setItem('st_opt_custom_model', customModelInput.value.trim());
});

// Validate API Key and URL connection
btnValidateKey.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API Key first!');
    return;
  }
  const provider = apiProviderSelect.value;
  let baseUrl = apiUrlInput.value.trim();

  validationStatusIndicator.textContent = '⏳';
  validationStatusIndicator.title = 'Validating connection...';
  log(`Validating API Key and URL for ${provider}...`);

  try {
    if (provider === 'gemini') {
      if (!baseUrl) baseUrl = 'https://generativelanguage.googleapis.com';
      baseUrl = baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `API returned status ${res.status}`);
      }
    } else {
      // OpenAI key validation using standard models listing endpoint (does not require model name parameter)
      if (!baseUrl) baseUrl = 'https://api.openai.com/v1';
      baseUrl = baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/models`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `API returned status ${res.status}`);
      }
    }

    validationStatusIndicator.textContent = '✅';
    validationStatusIndicator.title = 'Validation Successful!';
    log('API Key validated and connection initialized successfully!', 'success');
  } catch (err) {
    validationStatusIndicator.textContent = '❌';
    validationStatusIndicator.title = `Validation failed: ${err.message}`;
    log(`API Key connection validation failed: ${err.message}`, 'danger');
  }
});

// Show/Hide API Key Toggle
toggleApiKeyBtn.addEventListener('click', () => {
  const type = apiKeyInput.type === 'password' ? 'text' : 'password';
  apiKeyInput.type = type;
  toggleApiKeyBtn.innerHTML = type === 'password' 
    ? `<svg class="icon-eye" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg class="icon-eye" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
});

// Logger function
function log(msg, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line text-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
  consoleLogs.classList.remove('hidden');
}

btnClearLogs.addEventListener('click', () => {
  consoleBody.innerHTML = '';
  consoleLogs.classList.add('hidden');
});

// File Upload Event Listeners
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.json')) {
    processUploadedFile(file);
  } else {
    alert('Please upload a valid JSON file.');
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    processUploadedFile(file);
  }
});

// Load sample files
btnLoadSampleCard.addEventListener('click', async () => {
  try {
    log('Loading sample character card...');
    const res = await fetch('/samples/sample_card.json');
    if (!res.ok) throw new Error('Could not find sample_card.json');
    const json = await res.json();
    processRawJson('sample_card.json', json, 27575);
  } catch (err) {
    log(`Error loading sample card: ${err.message}`, 'danger');
  }
});

btnLoadSampleLorebook.addEventListener('click', async () => {
  try {
    log('Loading sample lorebook...');
    const res = await fetch('/samples/sample_lorebook.json');
    if (!res.ok) throw new Error('Could not find sample_lorebook.json');
    const json = await res.json();
    processRawJson('sample_lorebook.json', json, 11455);
  } catch (err) {
    log(`Error loading sample lorebook: ${err.message}`, 'danger');
  }
});

// Process File Reader
function processUploadedFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      processRawJson(file.name, json, file.size);
    } catch (err) {
      log(`Error parsing JSON file: ${err.message}`, 'danger');
      alert('Error parsing JSON. Check if it is a valid SillyTavern JSON file.');
    }
  };
  reader.readAsText(file);
}

// Normalize & inspect raw JSON
function processRawJson(filename, json, size) {
  activeFile = {
    name: filename,
    size: size,
    rawJson: json,
    entries: []
  };

  // Determine Type
  if (json.spec === 'chara_card_v3' || (json.data && json.data.character_book)) {
    activeFile.type = 'card';
    log(`Detected File Type: SillyTavern Character Card (V3)`);
  } else if (json.entries) {
    activeFile.type = 'lorebook';
    log(`Detected File Type: Standalone SillyTavern Lorebook`);
  } else {
    // Attempt fallback or V2
    if (json.data && json.data.name) {
      activeFile.type = 'card';
      log(`Detected File Type: SillyTavern Character Card (V2/Fallback)`);
    } else {
      log(`Warning: Format unknown, attempting standalone lorebook parser`, 'warning');
      activeFile.type = 'lorebook';
    }
  }

  // Parse Entries
  let rawEntries = [];
  if (activeFile.type === 'card') {
    const book = json.data && json.data.character_book;
    if (book && Array.isArray(book.entries)) {
      rawEntries = book.entries;
    } else if (json.character_book && Array.isArray(json.character_book.entries)) {
      // In some formats, character_book is top level
      rawEntries = json.character_book.entries;
    }
  } else {
    // Lorebook
    if (json.entries) {
      if (Array.isArray(json.entries)) {
        rawEntries = json.entries;
      } else {
        // Entries is keyed object e.g. {"0": {...}, "1": {...}}
        rawEntries = Object.keys(json.entries).map(key => {
          return {
            uid: json.entries[key].uid !== undefined ? json.entries[key].uid : key,
            originalKey: key, // Keep original dictionary key for exporting
            ...json.entries[key]
          };
        });
      }
    }
  }

  if (rawEntries.length === 0) {
    log('No lorebook entries found in this file.', 'warning');
    alert('No lorebook entries found in the file.');
    return;
  }

  // Normalize entries into unified structure
  activeFile.entries = rawEntries.map((entry, idx) => {
    // Extract common fields
    const comment = entry.comment || entry.comment === '' ? entry.comment : `Entry #${idx + 1}`;
    const content = entry.content || '';
    const keys = Array.isArray(entry.keys) ? entry.keys : (Array.isArray(entry.key) ? entry.key : []);
    
    // Config fields
    let constant = entry.constant !== undefined ? entry.constant : false;
    let order = entry.insertion_order !== undefined ? entry.insertion_order : (entry.order !== undefined ? entry.order : 100);
    
    // Position parsing
    let position = entry.position; // String in cards, number in lorebooks
    let extPosition = entry.extensions && entry.extensions.position !== undefined ? entry.extensions.position : null;
    let depth = entry.extensions && entry.extensions.depth !== undefined ? entry.extensions.depth : (entry.depth !== undefined ? entry.depth : 4);
    let role = entry.extensions && entry.extensions.role !== undefined ? entry.extensions.role : (entry.role !== undefined ? entry.role : null);

    return {
      uid: entry.id !== undefined ? entry.id : (entry.uid !== undefined ? entry.uid : idx),
      originalKey: entry.originalKey || null,
      comment,
      content,
      keys,
      currentConfig: {
        constant,
        order,
        position,
        extPosition,
        depth,
        role
      },
      assignedGroup: null, // AI classified group (1-5)
      aiExplanation: '',
      status: 'unchecked', // 'unchecked', 'correct', 'mismatched'
      originalRef: entry // Reference to original object to edit in-place
    };
  });

  // Display UI Overview
  loadedFileName.textContent = activeFile.name;
  loadedFileSize.textContent = formatBytes(activeFile.size);
  loadedEntriesCount.textContent = `${activeFile.entries.length} entries found`;
  loadedFileDescription.textContent = activeFile.rawJson.description || activeFile.rawJson.data?.description || 'No description available.';
  
  if (activeFile.type === 'card') {
    document.getElementById('file-type-badge').textContent = 'CARD V3';
    document.getElementById('file-type-badge').style.backgroundColor = 'var(--color-primary)';
  } else {
    document.getElementById('file-type-badge').textContent = 'LOREBOOK';
    document.getElementById('file-type-badge').style.backgroundColor = 'var(--color-info)';
  }

  emptyState.classList.add('hidden');
  fileOverview.classList.remove('hidden');
  entriesSection.classList.remove('hidden');

  btnFixAll.disabled = true;
  btnDownload.disabled = true;

  updateDistribution();
  updateProgress(0, 'Ready');
  renderEntries();
  log(`Loaded file: ${activeFile.name} with ${activeFile.entries.length} entries. Press Scan to start analysis.`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Render entries to table
function renderEntries() {
  entriesTableBody.innerHTML = '';
  let filtered = activeFile.entries;

  if (currentFilter === 'mismatched') {
    filtered = activeFile.entries.filter(e => e.status === 'mismatched');
  } else if (currentFilter === 'correct') {
    filtered = activeFile.entries.filter(e => e.status === 'correct');
  }

  filtered.forEach(entry => {
    const tr = document.createElement('tr');
    
    // Status Column icon/color
    let statusHtml = '';
    if (entry.status === 'unchecked') {
      statusHtml = `<span class="status-pill text-muted">Unchecked</span>`;
    } else if (entry.status === 'correct') {
      statusHtml = `<span class="status-pill aligned"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Aligned</span>`;
    } else {
      statusHtml = `<span class="status-pill mismatched"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Mismatched</span>`;
    }

    // Config format helper
    const renderConfig = (cfg) => {
      let posText = cfg.position;
      if (activeFile.type === 'card') {
        if (cfg.extPosition === 4) posText = '@D Sys';
        else if (cfg.extPosition === 0) posText = 'Before Char';
        else if (cfg.extPosition === 1) posText = 'After Char';
        else if (cfg.extPosition === 2) posText = 'Top of AN';
        else if (cfg.extPosition === 3) posText = 'Bottom of AN';
        else if (cfg.extPosition === 7) posText = 'Outlet';
      } else {
        if (cfg.position === 4) posText = '@D Sys';
        else if (cfg.position === 0) posText = 'Before Char';
        else if (cfg.position === 1) posText = 'After Char';
        else if (cfg.position === 2) posText = 'Top of AN';
        else if (cfg.position === 3) posText = 'Bottom of AN';
        else if (cfg.position === 7) posText = 'Outlet';
      }
      return `
        <div class="config-display">
          <span><span class="label">Strat:</span><span class="val">${cfg.constant ? 'Constant' : 'Normal'}</span></span>
          <span><span class="label">Pos:</span><span class="val">${posText}</span></span>
          <span><span class="label">Depth:</span><span class="val">${cfg.depth !== null ? cfg.depth : '-'}</span></span>
          <span><span class="label">Order:</span><span class="val">${cfg.order}</span></span>
        </div>
      `;
    };

    // AI Group Badge
    let groupBadge = `<span class="badge group-none-bg">Unclassified</span>`;
    if (entry.assignedGroup) {
      groupBadge = `<span class="badge group-${entry.assignedGroup}-bg" title="${GROUP_RULES[entry.assignedGroup].name}">Group ${entry.assignedGroup}</span>`;
    }

    // Target Config details
    let targetConfigHtml = '<span class="text-muted">-</span>';
    if (entry.assignedGroup) {
      const rule = GROUP_RULES[entry.assignedGroup];
      const targetCfg = {
        constant: rule.constant,
        position: rule.positionName,
        depth: entry.assignedGroup === 1 ? 0 : (entry.assignedGroup === 2 ? 4 : '-'),
        order: rule.assignedOrder || (entry.assignedGroup === 1 ? 900 : (entry.assignedGroup === 2 ? 800 : (entry.assignedGroup === 3 ? 200 : (entry.assignedGroup === 4 ? 150 : 100))))
      };
      
      // Handle strategy for group 2 which can be either constant or normal
      if (entry.assignedGroup === 2) {
        targetCfg.constant = entry.currentConfig.constant; // Retain current, or set true as preference
      }

      targetConfigHtml = `
        <div class="config-display">
          <span><span class="label">Strat:</span><span class="val">${targetCfg.constant ? 'Constant' : 'Normal'}</span></span>
          <span><span class="label">Pos:</span><span class="val">${targetCfg.position}</span></span>
          <span><span class="label">Depth:</span><span class="val">${targetCfg.depth}</span></span>
          <span><span class="label">Order:</span><span class="val">${targetCfg.order}</span></span>
        </div>
      `;
    }

    const keywords = entry.keys.slice(0, 3).map(k => `<span class="meta-tag">${k}</span>`).join(' ');

    tr.innerHTML = `
      <td>
        <div class="entry-title">${escapeHtml(entry.comment)}</div>
        <div class="entry-meta-tags">
          <span class="meta-tag text-info">#${entry.uid}</span>
          ${keywords}
        </div>
      </td>
      <td class="content-cell" title="${escapeHtml(entry.content)}">${escapeHtml(entry.content)}</td>
      <td>${renderConfig(entry.currentConfig)}</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
          ${groupBadge}
          ${entry.aiExplanation ? `<span class="text-muted" style="font-size:0.7rem; text-align:center; max-width:120px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(entry.aiExplanation)}">${escapeHtml(entry.aiExplanation)}</span>` : ''}
        </div>
      </td>
      <td>${targetConfigHtml}</td>
      <td>${statusHtml}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-actions-edit" style="padding: 6px 10px;" data-uid="${entry.uid}">Review</button>
          ${entry.status === 'mismatched' ? `<button class="btn btn-success btn-actions-fix" style="padding: 6px 10px;" data-uid="${entry.uid}">Fix</button>` : ''}
        </div>
      </td>
    `;
    entriesTableBody.appendChild(tr);
  });

  // Set action click handlers
  document.querySelectorAll('.btn-actions-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.target.getAttribute('data-uid');
      openEditModal(uid);
    });
  });

  document.querySelectorAll('.btn-actions-fix').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.target.getAttribute('data-uid');
      fixEntryConfig(uid);
    });
  });

  updateFilterCounts();
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Update counters in filtering tabs
function updateFilterCounts() {
  const all = activeFile.entries.length;
  const mismatched = activeFile.entries.filter(e => e.status === 'mismatched').length;
  const correct = activeFile.entries.filter(e => e.status === 'correct').length;

  countAll.textContent = all;
  countMismatched.textContent = mismatched;
  countCorrect.textContent = correct;

  if (mismatched > 0) {
    statIssuesCount.textContent = `${mismatched} misconfigured entries detected`;
    statIssuesCount.className = 'stat-val text-warning';
    btnFixAll.disabled = false;
  } else {
    statIssuesCount.textContent = 'All entries aligned!';
    statIssuesCount.className = 'stat-val text-success';
    btnFixAll.disabled = true;
  }
}

// Update the visually beautiful distribution bar
function updateDistribution() {
  const total = activeFile.entries.length || 1;
  const dist = [0, 0, 0, 0, 0, 0]; // Index 0 is unclassified, 1-5 are groups

  activeFile.entries.forEach(entry => {
    const grp = entry.assignedGroup || 0;
    dist[grp]++;
  });

  const bars = groupDistribution.querySelectorAll('.dist-bar');
  
  // Custom colors for groups
  const colors = ['#6b7280', '#f43f5e', '#06b6d4', '#3b82f6', '#f59e0b', '#10b981'];

  bars.forEach((bar, idx) => {
    const groupNum = idx + 1;
    const count = dist[groupNum];
    const pct = (count / total) * 100;
    
    bar.style.width = `${pct}%`;
    bar.style.backgroundColor = colors[groupNum];
    bar.title = `${GROUP_RULES[groupNum].name}: ${count} entries (${Math.round(pct)}%)`;
  });
}

function updateProgress(percent, label) {
  aiProgressBar.style.width = `${percent}%`;
  aiProgressText.textContent = label;
}

// Filter Tab Clicks
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-filter');
    renderEntries();
  });
});

/* LOCAL HEURISTIC SCANNER */
btnRunHeuristic.addEventListener('click', () => {
  log('Starting local heuristic scan based on entry comments, titles and content keywords...');
  let checked = 0;
  
  activeFile.entries.forEach(entry => {
    const result = runLocalHeuristicOnEntry(entry);
    entry.assignedGroup = result.group;
    entry.aiExplanation = result.explanation;
    
    // Evaluate if settings are correct based on this classification
    evaluateEntryStatus(entry);
    checked++;
  });

  log(`Heuristic scan completed. Classified ${checked} entries.`, 'success');
  updateDistribution();
  renderEntries();
  btnDownload.disabled = false;
});

function runLocalHeuristicOnEntry(entry) {
  const textToAnalyze = `${entry.comment} ${entry.keys.join(' ')} ${entry.content}`.toLowerCase();
  
  // Nhóm 1 keywords: Sức mạnh cốt lõi, tu luyện, cấp độ, cảnh giới, đan dược, vũ khí, võ công, chiêu thức
  const g1Keywords = ['tu luyện', 'tu luyen', 'sức mạnh cốt lõi', 'hệ thống sức mạnh', 'cảnh giới', 'canh gioi', 'linh khí', 'năng lượng', 'nang luong', 'đan dược', 'đế cấp', 'thần cấp', 'pháp bảo', 'huyền công', 'giới hạn', 'gioi han', 'tinh hoa', 'định luật'];
  
  // Nhóm 2: Thế giới quan, quy luật tự nhiên, địa lý vĩ mô, chủng tộc, tôn giáo
  const g2Keywords = ['thế giới quan', 'the gioi quan', 'lịch sử', 'lich su', 'truyền thuyết', 'truyen thuyet', 'thần thoại', 'chủng tộc', 'chung toc', 'yêu tộc', 'nhân tộc', 'ma tộc', 'quy luật', 'quy luat', 'sinh thái', 'tôn giáo', 'đạo giáo', 'phật giáo'];

  // Nhóm 3: Nhân vật cụ thể, NPC, nhân vật chính, tính cách
  const g3Keywords = ['nhân vật', 'nhan vat', 'sinh vật', 'sinh vat', 'quái thú', 'quai thu', 'vua', 'hoàng đế', 'diễn viên', 'tuổi', 'ngoại hình', 'tính cách', 'tinh cach', 'sở thích', 'so thich'];

  // Nhóm 4: Phe phái, tổ chức, môn phái, bang hội, triều đình
  const g4Keywords = ['phe phái', 'phe phai', 'tổ chức', 'to chuc', 'môn phái', 'mon phai', 'gia tộc', 'triều đình', 'tông môn', 'bang hội', 'học viện', 'hội đồng', 'hiệp hội', 'quân đội'];

  // Nhóm 5: Địa điểm, khu vực, thành phố, kiến trúc, cảnh quan vật lý
  const g5Keywords = ['địa điểm', 'dia diem', 'khu vực', 'khu vuc', 'thành phố', 'thanh pho', 'quốc gia', 'lãnh thổ', 'ngọn núi', 'sông', 'biển', 'hang động', 'ngôi đền', 'lâu đài', 'bản đồ'];

  // Score match counts
  const scores = [0, 0, 0, 0, 0, 0]; // 1-5 indices
  
  g1Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[1] += 2; });
  g2Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[2] += 2; });
  g3Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[3] += 2; });
  g4Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[4] += 2; });
  g5Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[5] += 2; });

  // Add regex matches for specific comments
  if (entry.comment.toLowerCase().includes('sức mạnh') || entry.comment.toLowerCase().includes('hệ thống') || entry.comment.toLowerCase().includes('power')) scores[1] += 5;
  if (entry.comment.toLowerCase().includes('thế giới') || entry.comment.toLowerCase().includes('quy luật') || entry.comment.toLowerCase().includes('world')) scores[2] += 5;
  if (entry.comment.toLowerCase().includes('nhân vật') || entry.comment.toLowerCase().includes('character')) scores[3] += 5;
  if (entry.comment.toLowerCase().includes('phe phái') || entry.comment.toLowerCase().includes('tổ chức') || entry.comment.toLowerCase().includes('faction') || entry.comment.toLowerCase().includes('guild')) scores[4] += 5;
  if (entry.comment.toLowerCase().includes('địa điểm') || entry.comment.toLowerCase().includes('khu vực') || entry.comment.toLowerCase().includes('location') || entry.comment.toLowerCase().includes('place')) scores[5] += 5;

  // Find max score
  let maxScore = 0;
  let classifiedGroup = 3; // Default to Group 3: Characters as fallback
  
  for (let i = 1; i <= 5; i++) {
    if (scores[i] > maxScore) {
      maxScore = scores[i];
      classifiedGroup = i;
    }
  }

  // If no matching keywords, do simple heuristic based on index or default
  let explanation = `Heuristic classified based on matching keywords (Score: ${maxScore})`;
  if (maxScore === 0) {
    // Look for comments
    if (entry.comment.match(/(sức mạnh|level|power|hệ thống|luật)/i)) { classifiedGroup = 1; explanation = "Heuristic matched power comment"; }
    else if (entry.comment.match(/(thế giới|world|lịch sử|sử)/i)) { classifiedGroup = 2; explanation = "Heuristic matched world comment"; }
    else if (entry.comment.match(/(phe|phái|bang|tông|tổ chức|guild|faction)/i)) { classifiedGroup = 4; explanation = "Heuristic matched faction comment"; }
    else if (entry.comment.match(/(nơi|khu|địa|thành|place|location|land)/i)) { classifiedGroup = 5; explanation = "Heuristic matched location comment"; }
    else { classifiedGroup = 3; explanation = "Default group assignment (No keyword match)"; }
  }

  return { group: classifiedGroup, explanation };
}

// Evaluate status comparing entry current settings against classification rules
function evaluateEntryStatus(entry) {
  if (!entry.assignedGroup) {
    entry.status = 'unchecked';
    return;
  }

  const rule = GROUP_RULES[entry.assignedGroup];
  const cfg = entry.currentConfig;
  
  let matches = true;

  // Constant strategy check
  if (entry.assignedGroup === 2) {
    // For Group 2: Constant / Normal (accept either, but let's check matches)
    // No strict constant strategy check, passes strategy matching
  } else {
    if (cfg.constant !== rule.constant) matches = false;
  }

  // Position & Order checks depending on card vs lorebook
  if (activeFile.type === 'card') {
    const cardRule = rule.card;
    if (cfg.position !== cardRule.position) matches = false;
    if (cfg.extPosition !== cardRule.extPosition) matches = false;
    if (cfg.order !== cardRule.order) matches = false;
    
    // Depth check only for At Depth System (Group 1 & 2)
    if (entry.assignedGroup === 1 || entry.assignedGroup === 2) {
      if (cfg.depth !== cardRule.depth) matches = false;
      if (cfg.role !== cardRule.role) matches = false;
    }
  } else {
    // Standalone Lorebook
    const lbRule = rule.lorebook;
    if (cfg.position !== lbRule.position) matches = false;
    if (cfg.order !== lbRule.order) matches = false;
    
    if (entry.assignedGroup === 1 || entry.assignedGroup === 2) {
      if (cfg.depth !== lbRule.depth) matches = false;
      if (cfg.role !== lbRule.role) matches = false;
    }
  }

  entry.status = matches ? 'correct' : 'mismatched';
}

/* AI SCANNERS (GEMINI / OPENAI) */
btnRunAi.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API Key in the sidebar first!');
    log('Failed: API key is empty.', 'danger');
    return;
  }

  const provider = apiProviderSelect.value;
  const model = apiModelSelect.value === 'custom' ? customModelInput.value.trim() : apiModelSelect.value;

  if (!model) {
    alert('Please select or type a model name!');
    return;
  }

  log(`Initializing AI Scan using ${provider} (${model})...`);
  updateProgress(0, 'Starting AI...');

  // Group entries in batches of 10 to save api calls and speed up
  const batchSize = 10;
  const entries = activeFile.entries;
  const total = entries.length;
  let processed = 0;

  try {
    for (let i = 0; i < total; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      updateProgress(Math.round((i / total) * 100), `Processing entries ${i + 1} to ${Math.min(i + batchSize, total)}...`);
      
      log(`Calling AI API for batch ${Math.floor(i / batchSize) + 1}...`);
      const results = await classifyBatchWithAi(batch, provider, model, apiKey);
      
      // Map results back to entries
      results.forEach(res => {
        const entry = entries.find(e => e.uid.toString() === res.uid.toString());
        if (entry) {
          entry.assignedGroup = res.group;
          entry.aiExplanation = res.explanation;
          evaluateEntryStatus(entry);
        }
      });

      processed += batch.length;
      updateProgress(Math.round((processed / total) * 100), `Processed ${processed}/${total} entries`);
      renderEntries();
      updateDistribution();
    }

    log(`AI Analysis successfully completed for all ${total} entries!`, 'success');
    updateProgress(100, 'Analysis Completed');
    btnDownload.disabled = false;
  } catch (err) {
    log(`AI Scan Error: ${err.message}`, 'danger');
    alert(`AI analysis failed: ${err.message}`);
    updateProgress(0, 'Failed');
  }
});

async function classifyBatchWithAi(batch, provider, model, apiKey) {
  // Format the batch payload for the prompt
  const items = batch.map(entry => {
    return {
      uid: entry.uid,
      comment: entry.comment,
      keys: entry.keys,
      content: entry.content.substring(0, 800) // Truncate content to avoid token overflow
    };
  });

  const prompt = `
Bạn là một trợ lý AI chuyên nghiệp phân loại thông tin thế giới (World Info / Lorebook) của SillyTavern.
Hãy đọc danh sách các mục nhập dưới đây và xếp chúng vào 1 trong 5 nhóm tương ứng theo hướng dẫn tuyệt đối sau:

### Nhóm 1: Hệ Thống Sức Mạnh Cốt Lõi (Group 1)
- Các định luật tuyệt đối về tu luyện, phân chia cảnh giới, các loại năng lượng (linh khí, ma lực...), vũ khí pháp bảo truyền thuyết, đan dược và giới hạn sức mạnh tối cao của thế giới.
- Ví dụ: Cảnh giới tu luyện (Luyện Khí -> Trúc Cơ -> Kim Đan...), Hệ thống ma pháp học, Định luật ma lực...

### Nhóm 2: Thế Giới Quan & Quy Luật Tự Nhiên (Group 2)
- Các thiết lập về bối cảnh thế giới vĩ mô, lịch sử thế giới, truyền thuyết cổ xưa, quy luật sinh thái, chủng tộc (yêu tộc, ma tộc, nhân tộc...), các tôn giáo và thần thoại.
- Ví dụ: Lịch sử đại lục, Truyền thuyết sáng thế, Quy luật sinh thái rừng tinh linh, Chủng tộc Ma nhân...

### Nhóm 3: Nhân Vật (Group 3)
- Các mô tả về nhân vật cụ thể, NPC, các loài sinh vật hoặc quái thú đặc hữu của thế giới.
- Ví dụ: Hồ sơ nhân vật Tiểu Vy, Thuộc tính của Thần Thú Phượng Hoàng, Thần tính của Arthur...

### Nhóm 4: Phe Phái, Tổ Chức & Tôn Giáo (Group 4)
- Thiết lập về thế lực, bang phái, tông môn, gia tộc, cơ cấu vận hành nội bộ, cấp bậc trong tổ chức, các mâu thuẫn nội bộ của tổ chức.
- Ví dụ: Tông môn Vô Cực Tông, Cơ cấu bang hội Assassin, Mâu thuẫn giữa 4 đại gia tộc...

### Nhóm 5: Địa Điểm & Khu Vực (Group 5)
- Địa điểm địa lý, thành trì, quốc gia, khu vực thiên nhiên, kiến trúc đặc thù, cảnh quan vật lý của thế giới.
- Ví dụ: Thành phố ánh sáng Lumina, Hang động tử thần, Cung điện hoàng gia, Đại lục Vô Song...

MỤC TIÊU PHÂN LOẠI:
Phân tích kỹ lưỡng nội dung và từ khóa của từng mục dưới đây, trả về một mảng JSON chứa kết quả phân loại cho từng mục nhập.
Định dạng JSON trả về phải là một mảng đối tượng hợp lệ gồm các trường:
- "uid": (số/chuỗi giống với uid cung cấp)
- "group": (chỉ điền số nguyên từ 1 đến 5)
- "explanation": (chuỗi mô tả ngắn gọn bằng tiếng Việt lý do chọn nhóm này, khoảng 10-15 từ)

Dữ liệu đầu vào cần phân loại:
${JSON.stringify(items, null, 2)}

Chỉ trả về chuỗi JSON hợp lệ, KHÔNG bao gồm markdown code block, KHÔNG có văn bản giải thích thừa bên ngoài JSON.
`;

  let responseText = '';
  
  if (provider === 'gemini') {
    let baseUrl = apiUrlInput.value.trim() || 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Gemini API returned status ${res.status}`);
    }

    const resJson = await res.json();
    responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    // OpenAI Provider
    let baseUrl = apiUrlInput.value.trim() || 'https://api.openai.com/v1';
    const url = `${baseUrl}/chat/completions`;
    const payload = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `OpenAI API returned status ${res.status}`);
    }

    const resJson = await res.json();
    responseText = resJson.choices?.[0]?.message?.content || '';
  }

  // Parse results
  try {
    // Handle cases where response might be wrapped in ```json ... ```
    let cleanJsonStr = responseText.trim();
    if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\s*/i, '').replace(/```$/, '');
    }
    
    let parsed = JSON.parse(cleanJsonStr);
    
    // In case the response is an object with an array field
    if (!Array.isArray(parsed) && parsed.results) {
      parsed = parsed.results;
    } else if (!Array.isArray(parsed) && typeof parsed === 'object') {
      // If AI returns an object with UIDs as keys
      parsed = Object.keys(parsed).map(key => ({
        uid: key,
        ...parsed[key]
      }));
    }

    return parsed;
  } catch (err) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('AI returned an invalid JSON response structure. Check browser console.');
  }
}

/* CORRECTING CONFIGURATIONS */
// Apply specific group rules configuration to an entry in the active file state
function fixEntryConfig(uid) {
  const entry = activeFile.entries.find(e => e.uid.toString() === uid.toString());
  if (!entry || !entry.assignedGroup) return;

  const group = entry.assignedGroup;
  const rule = GROUP_RULES[group];
  const orig = entry.originalRef;

  log(`Aligning entry "${entry.comment}" to Group ${group}...`);

  // 1. Update Strategy
  if (group === 2) {
    // Keep user strategy if Constant/Normal, but we can set to true as default for safety
    if (orig.constant === undefined) orig.constant = true;
  } else {
    orig.constant = rule.constant;
  }

  // 2. Update Position, Depth, Role, Order based on Card vs Lorebook
  if (activeFile.type === 'card') {
    const cardRule = rule.card;
    orig.position = cardRule.position;
    orig.insertion_order = cardRule.order;

    if (!orig.extensions) orig.extensions = {};
    orig.extensions.position = cardRule.extPosition;
    
    if (group === 1 || group === 2) {
      orig.extensions.depth = cardRule.depth;
      orig.extensions.role = cardRule.role;
    }
  } else {
    // Standalone Lorebook
    const lbRule = rule.lorebook;
    orig.position = lbRule.position;
    orig.order = lbRule.order;
    orig.constant = orig.constant !== undefined ? orig.constant : lbRule.constant;
    
    if (group === 1 || group === 2) {
      orig.depth = lbRule.depth;
      orig.role = lbRule.role;
    }
  }

  // Update current config mirror
  entry.currentConfig.constant = orig.constant;
  entry.currentConfig.order = orig.insertion_order !== undefined ? orig.insertion_order : orig.order;
  entry.currentConfig.position = orig.position;
  entry.currentConfig.extPosition = orig.extensions?.position !== undefined ? orig.extensions.position : null;
  entry.currentConfig.depth = orig.extensions?.depth !== undefined ? orig.extensions.depth : (orig.depth !== undefined ? orig.depth : 4);
  entry.currentConfig.role = orig.extensions?.role !== undefined ? orig.extensions.role : (orig.role !== undefined ? orig.role : null);

  entry.status = 'correct';
  
  renderEntries();
}

// Auto Fix All Mismatched Entries
btnFixAll.addEventListener('click', () => {
  const mismatched = activeFile.entries.filter(e => e.status === 'mismatched');
  if (mismatched.length === 0) return;

  log(`Auto-fixing ${mismatched.length} misconfigured entries...`);
  mismatched.forEach(entry => {
    fixEntryConfig(entry.uid);
  });
  log(`All misconfigured entries have been aligned to the rules.`, 'success');
  renderEntries();
});

/* MODAL ENTRY EDITOR & REVIEW */
function openEditModal(uid) {
  const entry = activeFile.entries.find(e => e.uid.toString() === uid.toString());
  if (!entry) return;

  editingEntryUid = uid;
  modalComment.value = entry.comment;
  modalKeys.value = entry.keys.join(', ');
  modalContent.value = entry.content;
  modalAssignedGroup.value = entry.assignedGroup || '';
  
  modalAiExplanation.innerHTML = `<strong>AI Analysis:</strong> ${entry.aiExplanation || 'Not analyzed yet.'}`;
  
  entryModal.classList.add('show');
}

function closeEditModal() {
  entryModal.classList.remove('show');
  editingEntryUid = null;
}

modalCloseBtn.addEventListener('click', closeEditModal);
modalCancelBtn.addEventListener('click', closeEditModal);

modalSaveBtn.addEventListener('click', () => {
  if (editingEntryUid === null) return;
  const entry = activeFile.entries.find(e => e.uid.toString() === editingEntryUid.toString());
  if (entry) {
    const selectedGroup = modalAssignedGroup.value;
    entry.assignedGroup = selectedGroup ? parseInt(selectedGroup) : null;
    entry.aiExplanation = 'Manually classified / overridden by user';
    
    evaluateEntryStatus(entry);
    updateDistribution();
    renderEntries();
    log(`Manually updated Group of "${entry.comment}" to Group ${selectedGroup || 'None'}`);
  }
  closeEditModal();
});

/* DOWNLOAD / EXPORT UPDATED FILE */
btnDownload.addEventListener('click', () => {
  if (!activeFile.rawJson) return;

  log('Exporting optimized file...');

  // activeFile.rawJson has been modified in-place since activeFile.entries[i].originalRef references it!
  // Let's verify by stringifying the main JSON file
  const jsonStr = JSON.stringify(activeFile.rawJson, null, 4);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  
  // Format filename: original_name_optimized.json
  let outName = activeFile.name;
  if (outName.endsWith('.json')) {
    outName = outName.substring(0, outName.length - 5) + '_optimized.json';
  } else {
    outName = outName + '_optimized.json';
  }

  a.download = outName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  log(`Optimized file "${outName}" successfully exported & downloaded!`, 'success');
});
