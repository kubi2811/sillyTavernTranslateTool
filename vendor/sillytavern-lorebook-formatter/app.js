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
const btnImportDefaultRules = document.getElementById('btn-import-default-rules');
const ruleFileInput = document.getElementById('rule-file-input');

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

// Default target rules imported from "Cấu hình Worldbook 2.txt".
const DEFAULT_GROUP_RULES = {
  1: {
    name: 'Thế giới quan & Tổng cương',
    strategyName: 'Constant',
    constant: true,
    positionName: 'Before Character',
    defaultOrder: 1,
    card: { position: 'before_char', extPosition: 0, depth: 4, role: null, order: 1 },
    lorebook: { position: 0, depth: 4, role: null, order: 1 }
  },
  2: {
    name: 'Xem lướt nhân vật & thế lực',
    strategyName: 'Constant',
    constant: true,
    positionName: 'Before Character',
    defaultOrder: 4,
    card: { position: 'before_char', extPosition: 0, depth: 4, role: null, order: 4 },
    lorebook: { position: 0, depth: 4, role: null, order: 4 }
  },
  3: {
    name: 'Chi tiết nhân vật cốt lõi',
    strategyName: 'Selective',
    constant: false,
    positionName: 'After Character',
    defaultOrder: 99,
    card: { position: 'after_char', extPosition: 1, depth: 2, role: null, order: 99 },
    lorebook: { position: 1, depth: 2, role: null, order: 99 }
  },
  4: {
    name: 'Cảnh vật & Chi tiết sự kiện',
    strategyName: 'Selective',
    constant: false,
    positionName: 'After Character',
    defaultOrder: 80,
    card: { position: 'after_char', extPosition: 1, depth: 2, role: null, order: 80 },
    lorebook: { position: 1, depth: 2, role: null, order: 80 }
  },
  5: {
    name: 'Tài liệu NPC',
    strategyName: 'Selective',
    constant: false,
    positionName: 'After Character',
    defaultOrder: 100,
    card: { position: 'after_char', extPosition: 1, depth: 2, role: null, order: 100 },
    lorebook: { position: 1, depth: 2, role: null, order: 100 }
  }
};

let GROUP_RULES = cloneDefaultRules();

function cloneDefaultRules() {
  return JSON.parse(JSON.stringify(DEFAULT_GROUP_RULES));
}

function normalizeRuleText(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function getRuleOrder(rule) {
  return rule.defaultOrder ?? rule.card.order ?? rule.lorebook.order;
}

function getRuleDepth(rule) {
  return rule.card.depth ?? rule.lorebook.depth ?? '-';
}

function renderRuleCards() {
  document.querySelectorAll('.group-rule-card').forEach(card => {
    const group = Number(card.dataset.group);
    const rule = GROUP_RULES[group];
    if (!rule) return;

    const title = card.querySelector('h4');
    if (title) title.textContent = `Nhóm ${group}: ${rule.name}`;

    const values = [
      rule.strategyName || (rule.constant ? 'Constant' : 'Selective'),
      rule.positionName,
      getRuleDepth(rule),
      getRuleOrder(rule)
    ];

    card.querySelectorAll('.rule-grid > div').forEach((cell, index) => {
      const valueNode = cell.querySelector('span:last-child');
      if (valueNode && values[index] !== undefined) {
        valueNode.textContent = String(values[index]);
      }
    });
  });
}

function updateActiveEntriesAfterRuleChange() {
  if (activeFile.entries.length > 0) {
    activeFile.entries.forEach(entry => {
      if (entry.assignedGroup) evaluateEntryStatus(entry);
    });
    updateDistribution();
    renderEntries();
  }
}

function saveCurrentRules(sourceName) {
  localStorage.setItem('st_opt_rule_preset', sourceName);
  localStorage.setItem('st_opt_rule_source_name', sourceName);
  localStorage.setItem('st_opt_group_rules', JSON.stringify(GROUP_RULES));
}

function loadStoredRules() {
  const savedRules = localStorage.getItem('st_opt_group_rules');
  if (!savedRules) return;

  try {
    const parsed = JSON.parse(savedRules);
    if (parsed && parsed[1] && parsed[5]) {
      GROUP_RULES = parsed;
    }
  } catch {
    localStorage.removeItem('st_opt_group_rules');
  }
}

function splitRuleSections(text) {
  const matches = [...text.matchAll(/^###\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return {
      title: match[1].trim(),
      body: text.slice(start, end)
    };
  });
}

function findRuleSection(sections, keywords) {
  return sections.find(section => {
    const normalized = normalizeRuleText(`${section.title}\n${section.body}`);
    return keywords.every(keyword => normalized.includes(keyword));
  });
}

function extractRuleOrder(section, fallbackOrder, group) {
  if (!section) return fallbackOrder;

  const normalized = normalizeRuleText(section.body);
  const match = normalized.match(/(?:thu tu|order)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!match) return fallbackOrder;

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;
  if (!Number.isFinite(first)) return fallbackOrder;
  if (!second) return first;

  if (group === 1 && first <= 1 && second >= 3) return 1;
  if (group === 4 && first <= 50 && second >= 98) return 80;
  return fallbackOrder;
}

function extractRuleConstant(section, fallbackConstant) {
  if (!section) return fallbackConstant;
  const normalized = normalizeRuleText(section.body);

  if (normalized.includes('den xanh duong') || normalized.includes('thuong truc') || normalized.includes('constant')) {
    return true;
  }
  if (normalized.includes('den xanh la') || normalized.includes('tu khoa') || normalized.includes('selective')) {
    return false;
  }
  return fallbackConstant;
}

function extractRulePosition(section, fallbackPosition) {
  if (!section) return fallbackPosition;
  const normalized = normalizeRuleText(section.body);

  if (normalized.includes('truoc dinh nghia nhan vat') || normalized.includes('before')) return 'before_char';
  if (normalized.includes('sau dinh nghia nhan vat') || normalized.includes('after')) return 'after_char';
  return fallbackPosition;
}

function setRuleTarget(group, sourceRule, section) {
  const constant = extractRuleConstant(section, sourceRule.constant);
  const position = extractRulePosition(section, sourceRule.card.position);
  const order = extractRuleOrder(section, getRuleOrder(sourceRule), group);
  const depth = position === 'before_char' ? 4 : (constant ? 4 : 2);
  const extPosition = position === 'before_char' ? 0 : 1;
  const lorebookPosition = position === 'before_char' ? 0 : 1;

  return {
    ...sourceRule,
    strategyName: constant ? 'Constant' : 'Selective',
    constant,
    positionName: position === 'before_char' ? 'Before Character' : 'After Character',
    defaultOrder: order,
    card: { position, extPosition, depth, role: null, order },
    lorebook: { position: lorebookPosition, depth, role: null, order }
  };
}

function parseTargetRulesFromText(text) {
  const sections = splitRuleSections(text);
  const rules = cloneDefaultRules();
  let matched = 0;

  const mappings = [
    { group: 1, keywords: ['the gioi quan'] },
    { group: 2, keywords: ['xem luot', 'nhan vat'] },
    { group: 3, keywords: ['thong tin chi tiet', 'nhan vat cot loi'] },
    { group: 4, keywords: ['boi canh', 'su kien'] },
    { group: 5, keywords: ['npc'] }
  ];

  mappings.forEach(({ group, keywords }) => {
    const section = findRuleSection(sections, keywords);
    if (!section) return;
    rules[group] = setRuleTarget(group, rules[group], section);
    matched++;
  });

  return { rules, matched };
}

function applyDefaultRulePreset(showLog = true) {
  GROUP_RULES = cloneDefaultRules();
  saveCurrentRules('worldbook2-default');
  renderRuleCards();
  updateActiveEntriesAfterRuleChange();

  if (showLog) {
    log('Imported Target Settings Rules from Cấu hình Worldbook 2 preset.', 'success');
  }
}

function importRuleTextFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = String(event.target?.result || '');
      const { rules, matched } = parseTargetRulesFromText(text);
      GROUP_RULES = rules;
      saveCurrentRules(`txt:${file.name}`);
      renderRuleCards();
      updateActiveEntriesAfterRuleChange();

      if (matched === 0) {
        log(`Could not parse rule sections in "${file.name}". Kept Worldbook 2 default preset.`, 'warning');
      } else {
        log(`Imported ${matched}/5 Target Settings Rules from "${file.name}".`, matched === 5 ? 'success' : 'warning');
      }
    } catch (err) {
      GROUP_RULES = cloneDefaultRules();
      renderRuleCards();
      log(`Import rule TXT failed: ${err.message}`, 'danger');
    } finally {
      if (ruleFileInput) ruleFileInput.value = '';
    }
  };

  reader.onerror = () => {
    log(`Cannot read rule TXT file "${file.name}".`, 'danger');
    if (ruleFileInput) ruleFileInput.value = '';
  };

  reader.readAsText(file, 'utf-8');
}

function openRuleFilePicker() {
  ruleFileInput?.click();
}

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

  loadStoredRules();
  updateApiUrlPlaceholder();
  updateModelInputVisibility();
  renderRuleCards();
});

btnImportDefaultRules?.addEventListener('click', () => {
  openRuleFilePicker();
});

ruleFileInput?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.txt') && file.type && file.type !== 'text/plain') {
    alert('Please select a .txt rule file.');
    if (ruleFileInput) ruleFileInput.value = '';
    return;
  }

  importRuleTextFile(file);
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
    let selective = entry.selective !== undefined ? entry.selective : !constant;
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
        selective,
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
          <span><span class="label">Strat:</span><span class="val">${cfg.constant ? 'Constant' : (cfg.selective ? 'Selective' : 'Normal')}</span></span>
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
        strategy: rule.strategyName || (rule.constant ? 'Constant' : 'Selective'),
        constant: rule.constant,
        position: rule.positionName,
        depth: getRuleDepth(rule),
        order: getRuleOrder(rule)
      };

      targetConfigHtml = `
        <div class="config-display">
          <span><span class="label">Strat:</span><span class="val">${targetCfg.strategy}</span></span>
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
  
  // Nhóm 1: Thế giới quan, tổng cương, luật nền, hệ thống sức mạnh cấp vĩ mô.
  const g1Keywords = ['thế giới quan', 'the gioi quan', 'tổng cương', 'tong cuong', 'bối cảnh thế giới', 'boi canh the gioi', 'lịch sử thế giới', 'lich su the gioi', 'quy luật', 'quy luat', 'định luật', 'dinh luat', 'hệ thống sức mạnh', 'he thong suc manh', 'ma pháp', 'ma phap', 'tu luyện', 'tu luyen', 'cảnh giới', 'canh gioi', 'chủng tộc', 'chung toc', 'tôn giáo', 'ton giao'];
  
  // Nhóm 2: Xem lướt nhân vật, thế lực, tổ chức và quan hệ tổng quan.
  const g2Keywords = ['xem lướt', 'xem luot', 'tổng quan nhân vật', 'tong quan nhan vat', 'danh sách nhân vật', 'danh sach nhan vat', 'cast', 'relationships', 'quan hệ', 'quan he', 'phe phái', 'phe phai', 'tổ chức', 'to chuc', 'gia tộc', 'gia toc', 'bang hội', 'bang hoi', 'học viện', 'hoc vien', 'quân đội', 'quan doi', 'thế lực', 'the luc'];

  // Nhóm 3: Chi tiết nhân vật cốt lõi.
  const g3Keywords = ['nhân vật chính', 'nhan vat chinh', 'nhân vật cốt lõi', 'nhan vat cot loi', 'hồ sơ nhân vật', 'ho so nhan vat', 'ngoại hình', 'ngoai hinh', 'tính cách', 'tinh cach', 'tiểu sử', 'tieu su', 'kỹ năng', 'ky nang', 'năng lực', 'nang luc', 'sở thích', 'so thich', 'nsfw'];

  // Nhóm 4: Cảnh vật, bối cảnh chi tiết, địa danh và sự kiện.
  const g4Keywords = ['cảnh vật', 'canh vat', 'bối cảnh', 'boi canh', 'sự kiện', 'su kien', 'địa điểm', 'dia diem', 'khu vực', 'khu vuc', 'thành phố', 'thanh pho', 'quốc gia', 'quoc gia', 'lãnh thổ', 'lanh tho', 'phòng', 'phong', 'dinh thự', 'dinh thu', 'cảnh quan', 'canh quan', 'event', 'location', 'place'];

  // Nhóm 5: Tài liệu NPC và vai phụ tải theo nhu cầu.
  const g5Keywords = ['npc', 'vai phụ', 'vai phu', 'nhân vật phụ', 'nhan vat phu', 'supporting character', 'background character', 'quần chúng', 'quan chung', 'dân làng', 'dan lang', 'giáo viên', 'giao vien', 'nhân viên', 'nhan vien', 'người hầu', 'nguoi hau'];

  // Score match counts
  const scores = [0, 0, 0, 0, 0, 0]; // 1-5 indices
  
  g1Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[1] += 2; });
  g2Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[2] += 2; });
  g3Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[3] += 2; });
  g4Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[4] += 2; });
  g5Keywords.forEach(k => { if (textToAnalyze.includes(k)) scores[5] += 2; });

  // Add regex matches for specific comments
  if (entry.comment.toLowerCase().includes('thế giới') || entry.comment.toLowerCase().includes('tổng cương') || entry.comment.toLowerCase().includes('world')) scores[1] += 5;
  if (entry.comment.toLowerCase().includes('xem lướt') || entry.comment.toLowerCase().includes('tổ chức') || entry.comment.toLowerCase().includes('faction') || entry.comment.toLowerCase().includes('guild')) scores[2] += 5;
  if (entry.comment.toLowerCase().includes('nhân vật') || entry.comment.toLowerCase().includes('character')) scores[3] += 5;
  if (entry.comment.toLowerCase().includes('bối cảnh') || entry.comment.toLowerCase().includes('sự kiện') || entry.comment.toLowerCase().includes('địa điểm') || entry.comment.toLowerCase().includes('location') || entry.comment.toLowerCase().includes('place')) scores[4] += 5;
  if (entry.comment.toLowerCase().includes('npc') || entry.comment.toLowerCase().includes('vai phụ')) scores[5] += 5;

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
    if (entry.comment.match(/(thế giới|world|lịch sử|tổng cương|quy luật|hệ thống)/i)) { classifiedGroup = 1; explanation = "Heuristic matched worldview comment"; }
    else if (entry.comment.match(/(xem lướt|overview|phe|phái|bang|tông|tổ chức|guild|faction)/i)) { classifiedGroup = 2; explanation = "Heuristic matched overview/faction comment"; }
    else if (entry.comment.match(/(nơi|khu|địa|thành|place|location|land|sự kiện|event|bối cảnh)/i)) { classifiedGroup = 4; explanation = "Heuristic matched scene/location comment"; }
    else if (entry.comment.match(/(npc|vai phụ|supporting)/i)) { classifiedGroup = 5; explanation = "Heuristic matched NPC comment"; }
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

  // Strategy check
  if (cfg.constant !== rule.constant) matches = false;
  if (cfg.selective !== !rule.constant) matches = false;

  // Position & Order checks depending on card vs lorebook
  if (activeFile.type === 'card') {
    const cardRule = rule.card;
    if (cfg.position !== cardRule.position) matches = false;
    if (cfg.extPosition !== cardRule.extPosition) matches = false;
    if (cfg.order !== cardRule.order) matches = false;
    if (cfg.depth !== cardRule.depth) matches = false;
    if (cardRule.role !== null && cfg.role !== cardRule.role) matches = false;
  } else {
    // Standalone Lorebook
    const lbRule = rule.lorebook;
    if (cfg.position !== lbRule.position) matches = false;
    if (cfg.order !== lbRule.order) matches = false;
    if (cfg.depth !== lbRule.depth) matches = false;
    if (lbRule.role !== null && cfg.role !== lbRule.role) matches = false;
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

### Nhóm 1: Thế giới quan & Tổng cương (Group 1)
- Tổng cương thế giới, lịch sử vĩ mô, luật nền, quy tắc xã hội, chủng tộc, tôn giáo, hệ thống sức mạnh cấp nền tảng.
- Cấu hình mục tiêu: before_char, order 1, constant true, selective false, depth 4.
- Ví dụ: Tổng cương đại lục, lịch sử lập quốc, luật ma pháp, hệ thống cảnh giới, quy tắc xã hội.

### Nhóm 2: Xem lướt nhân vật & thế lực (Group 2)
- Mục overview/list giúp AI luôn biết thế giới có những ai, phe nào, tổ chức nào, quan hệ tổng quan ra sao.
- Cấu hình mục tiêu: before_char, order 4, constant true, selective false, depth 4.
- Ví dụ: Danh sách nhân vật chính, sơ đồ phe phái, tổng quan tổ chức và quan hệ.

### Nhóm 3: Chi tiết nhân vật cốt lõi (Group 3)
- Hồ sơ đầy đủ của nhân vật chính/cốt lõi: ngoại hình, tính cách, tiểu sử, năng lực, quan hệ, thói quen.
- Cấu hình mục tiêu: after_char, order 99, constant false, selective true, depth 2.
- Ví dụ: Hồ sơ chi tiết Han Isratte, ngoại hình/tính cách/kỹ năng của nhân vật cốt lõi.

### Nhóm 4: Cảnh vật & Chi tiết sự kiện (Group 4)
- Địa điểm, cảnh vật, phòng ốc, khu vực cụ thể, bối cảnh nhỏ, sự kiện hoặc tình huống được tải theo nhu cầu.
- Cấu hình mục tiêu: after_char, order 80, constant false, selective true, depth 2.
- Ví dụ: Cung điện, phòng học, trận chiến, sự kiện quá khứ, khu vực cần mô tả khi được nhắc đến.

### Nhóm 5: Tài liệu NPC (Group 5)
- NPC, vai phụ, nhân vật nền, tài liệu phụ trợ hoặc bộ điều khiển tải theo nhu cầu.
- Cấu hình mục tiêu: after_char, order 100, constant false, selective true, depth 2.
- Ví dụ: Hồ sơ NPC, người hầu, giáo viên, nhân viên, vai phụ xuất hiện khi được nhắc đến.

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
  orig.constant = rule.constant;
  orig.selective = !rule.constant;

  // 2. Update Position, Depth, Role, Order based on Card vs Lorebook
  if (activeFile.type === 'card') {
    const cardRule = rule.card;
    orig.position = cardRule.position;
    orig.insertion_order = cardRule.order;

    if (!orig.extensions) orig.extensions = {};
    orig.extensions.position = cardRule.extPosition;
    orig.extensions.depth = cardRule.depth;

    if (cardRule.role !== null) {
      orig.extensions.role = cardRule.role;
    } else if (orig.extensions.role !== undefined) {
      delete orig.extensions.role;
    }
  } else {
    // Standalone Lorebook
    const lbRule = rule.lorebook;
    orig.position = lbRule.position;
    orig.order = lbRule.order;
    orig.constant = rule.constant;
    orig.depth = lbRule.depth;

    if (lbRule.role !== null) {
      orig.role = lbRule.role;
    } else if (orig.role !== undefined) {
      delete orig.role;
    }
  }

  // Update current config mirror
  entry.currentConfig.constant = orig.constant;
  entry.currentConfig.selective = orig.selective;
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
