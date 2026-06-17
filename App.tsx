
import React, { useState, useEffect, useRef } from 'react';
import { Lorebook, LorebookEntry, OpenAISettings, WorldbuildingAction, ChatMessage, WorldbuildingStep } from './types';
import { LorebookList } from './components/LorebookList';
import { EntryEditor } from './components/EntryEditor';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { TranslationModal } from './components/TranslationModal';
import { WorldbuildingChat } from './components/WorldbuildingChat';
import { WikiCollector } from './components/WikiCollector';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { Download, Upload, Settings, BookOpen, MessageSquare, Edit, Languages, HelpCircle, Zap } from 'lucide-react';
import { getOptimizedEntrySettings } from './utils/optimize';
import { optimizeEntireLorebook } from './services/openai';
import { DEFAULT_MASTER_INSTRUCTION } from './constants/masterInstruction';
import { DEFAULT_STEPS, DEFAULT_PROMPTS, PIPELINE_VERSION } from './constants/pipelineDefaults';
import { loadLocal, saveLocal, readDisk, getStorageDir, getLocalStorageUsage } from './utils/storage';

const DEFAULT_SETTINGS: OpenAISettings = {
  baseUrl: 'https://goldenglow.webn.cc/',
  apiKey: typeof process !== 'undefined' && process.env?.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : '',
  model: 'gemini-3.1-pro-preview',
  contextSize: 2000000,
  maxTokens: 65000,
  temperature: 1.1,
  topK: 64,
  topP: 0.9,
  streaming: true,
  nsfw: false,
  enableSearch: true,
  minTokens: 4000,
  enableCompletenessProtocol: true,
  // Đa model + RPM: model chính (Pro) làm việc nặng, model phụ (Flash) việc ngắn.
  // Default = đúng 2 model người dùng đang chạy → đưa code cho người khác chỉ cần nhập API key.
  enableSecondaryModel: true,
  secondaryModel: 'gemini-3-flash',
  primaryRpm: 5,
  secondaryRpm: 10,
  // Chế độ Mix: bật sẵn → pipeline tự song công Pro + Flash (~3x nhanh hơn).
  mixMode: true,
  // Super Mix: mặc định TẮT (chỉ bật khi cần tốc độ tối đa, chấp nhận phân loại thô hơn).
  superMix: false,
  // Bước 6 gộp trùng ngữ nghĩa: mặc định BẬT.
  semanticDedup: true,
  // "Hướng dẫn tổng" mặc định = nội dung file Cấu hình Worldbook 2.txt (gộp 2 tab cũ thành 1 text bự).
  masterInstruction: DEFAULT_MASTER_INSTRUCTION,
};

const DEFAULT_LOREBOOK: Lorebook = {
  name: 'New Lorebook',
  description: '',
  entries: []
};

// Gộp settings đã lưu với mặc định + áp migration (Hướng dẫn tổng, aiPrompts, apiKey từ env).
// Dùng chung cho cả init lúc khởi động lẫn hydrate từ file đĩa.
function buildSettings(parsed: any): OpenAISettings {
  const merged: OpenAISettings = { ...DEFAULT_SETTINGS, ...(parsed || {}) };
  if (!merged.masterInstruction || !merged.masterInstruction.trim()) {
    merged.masterInstruction = DEFAULT_MASTER_INSTRUCTION;
  }
  // ─── MIGRATE bộ bước/prompt: bản cũ chỉ 4 bước (thiếu Dòng Thời Gian) + lệch nhau ───
  // Nạp 5 bước + 5 prompt gốc. Giữ nguyên nếu user đã tự thêm (≥5 bước) để không mất tùy biến.
  if ((merged.pipelineVersion ?? 0) < PIPELINE_VERSION) {
    if (!merged.steps || merged.steps.length < 5) {
      merged.steps = JSON.parse(JSON.stringify(DEFAULT_STEPS));
    } else if (merged.steps[0] && merged.steps[0].singleton === undefined) {
      // Đã có ≥5 bước (user v2): vá cờ singleton cho BƯỚC ĐẦU (Thế Giới Quan+META)
      // mà không phá tùy biến prompt của user.
      merged.steps[0].singleton = true;
    }
    if (!merged.aiPrompts || merged.aiPrompts.length < 5) {
      merged.aiPrompts = JSON.parse(JSON.stringify(DEFAULT_PROMPTS));
    }
    merged.pipelineVersion = PIPELINE_VERSION;
  }
  if (!merged.steps || merged.steps.length === 0) merged.steps = JSON.parse(JSON.stringify(DEFAULT_STEPS));
  if (!merged.aiPrompts || merged.aiPrompts.length === 0) merged.aiPrompts = JSON.parse(JSON.stringify(DEFAULT_PROMPTS));
  if (!merged.apiKey && typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    merged.apiKey = process.env.GEMINI_API_KEY;
  }
  return merged;
}

const App: React.FC = () => {
  // --- State ---
  // Khôi phục lorebook từ localStorage → reload/crash giữa lúc sinh KHÔNG mất công.
  const [lorebook, setLorebook] = useState<Lorebook>(() => {
    try {
      const saved = localStorage.getItem('sillyLore_lorebook');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.entries)) return parsed as Lorebook;
      }
    } catch { /* hỏng dữ liệu lưu → dùng mặc định */ }
    return DEFAULT_LOREBOOK;
  });
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [settings, setSettings] = useState<OpenAISettings>(() => buildSettings(loadLocal<any>('sillyLore_settings', null)));

  // Persistent Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content: 'người dùng BAKA!!!',
      timestamp: Date.now(),
      actions: []
    }
  ]);

  // UI Modes
  const [activeView, setActiveView] = useState<'editor' | 'worldbuilding'>('editor');
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isOptimizeConfirmOpen, setIsOptimizeConfirmOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [optimizeResultCount, setOptimizeResultCount] = useState<number | null>(null);
  const [wikiDataToFeed, setWikiDataToFeed] = useState<{ name: string; content: string } | null>(null);
  const [pipelineToAnalyze, setPipelineToAnalyze] = useState<WorldbuildingStep[] | null>(null);
  const [pendingOptimizationResults, setPendingOptimizationResults] = useState<any[] | null>(null);

  // Lưu trữ trên đĩa + cảnh báo dung lượng
  const hydratedRef = useRef(false);                 // chặn ghi đè file trước khi hydrate xong
  const [storageDir, setStorageDir] = useState<string | null>(null); // đường dẫn folder lưu (dev)
  const [storageWarning, setStorageWarning] = useState<string | null>(null); // banner cảnh báo gần đầy

  // --- Effects ---
  // Hydrate từ FILE ĐĨA (nếu chạy `npm run dev`): file là nguồn thật, ưu tiên hơn localStorage.
  useEffect(() => {
    (async () => {
      try {
        const dir = await getStorageDir();
        if (dir) setStorageDir(dir);
        const [dSettings, dLore] = await Promise.all([
          readDisk<any>('sillyLore_settings'),
          readDisk<any>('sillyLore_lorebook'),
        ]);
        if (dSettings) setSettings(buildSettings(dSettings));
        if (dLore && Array.isArray(dLore.entries)) setLorebook(dLore as Lorebook);
      } catch { /* không có dev-server → dùng localStorage */ }
      finally { hydratedRef.current = true; }
    })();
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return; // chưa hydrate xong → chưa ghi (tránh đè file bằng giá trị cũ)
    try {
      saveLocal('sillyLore_settings', settings);
    } catch (e) {
      setStorageWarning('Bộ nhớ trình duyệt đã đầy — không lưu được cài đặt. Hãy chuyển sang chạy local (lưu ra file) hoặc xoá bớt dữ liệu.');
    }
  }, [settings]);

  // Tự lưu lorebook — DEBOUNCE 1.2s. Pipeline commit từng chunk ⇒ lorebook đổi liên tục;
  // nếu lưu ngay mỗi lần sẽ stringify + ghi file hàng chục lần (giật với lorebook 1000+ mục).
  // Debounce gộp lại → chỉ lưu khi ngớt thay đổi, mượt hơn nhiều, vẫn không mất dữ liệu.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const id = setTimeout(() => {
      try {
        saveLocal('sillyLore_lorebook', lorebook);
        const { pct } = getLocalStorageUsage();
        if (pct >= 80) {
          setStorageWarning(`Bộ nhớ trình duyệt đã dùng ~${pct}% (giới hạn ~5MB). Lorebook lớn có thể không lưu được — nên chạy bản local để lưu ra file đĩa.`);
        } else if (pct < 70 && storageWarning) {
          setStorageWarning(null);
        }
      } catch (e) {
        setStorageWarning('Bộ nhớ trình duyệt đã đầy — không lưu được lorebook. Hãy chạy bản local (lưu ra file) hoặc xoá bớt entry.');
      }
    }, 1200);
    return () => clearTimeout(id);
  }, [lorebook]);

  // --- Handlers ---

  const handleAddEntry = () => {
    const newUid = lorebook.entries.length > 0 
      ? Math.max(...lorebook.entries.map(e => e.uid)) + 1 
      : 1;

    const newEntry: LorebookEntry = {
      uid: newUid,
      key: [],
      secondary_keys: [],
      comment: 'Mục mới',
      content: '',
      constant: false,
      selective: true,
      vectorized: false,
      key_logic: 'and_any',
      order: 100,
      position: 'before_char',
      scan_depth: 2,
      case_sensitive: false,
      match_whole_words: true,
      prevent_recursion: true,
      delay_until_recursion: false,
      non_recursable: true,
      ignore_budget: false,
      priority: 0,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      probability: 0,
      enabled: true
    };

    setLorebook(prev => ({ ...prev, entries: [...prev.entries, newEntry] }));
    setSelectedUid(newUid);
    return newEntry; // Return for AI usage
  };

  const handleDeleteEntry = () => {
    if (deleteConfirmId === null) return;
    setLorebook(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.uid !== deleteConfirmId)
    }));
    if (selectedUid === deleteConfirmId) {
      setSelectedUid(null);
    }
    setDeleteConfirmId(null);
  };

  const handleDuplicateEntry = (entry: LorebookEntry) => {
    const newUid = Math.max(...lorebook.entries.map(e => e.uid), 0) + 1;
    const duplicated: LorebookEntry = {
      ...entry,
      uid: newUid,
      comment: `${entry.comment} (Copy)`,
    };
    setLorebook(prev => ({ ...prev, entries: [...prev.entries, duplicated] }));
    setSelectedUid(newUid);
  };

  const handleUpdateEntry = (updated: LorebookEntry) => {
    setLorebook(prev => ({
      ...prev,
      entries: prev.entries.map(e => e.uid === updated.uid ? updated : e)
    }));
  };

  // Bước 6: gộp các nhóm trùng NGỮ NGHĨA (Flash đã xác nhận). Mỗi group = các comment
  // cùng 1 thực thể → giữ bản content DÀI NHẤT, gộp keys, xóa các bản còn lại. Trả số đã xóa.
  const handleMergeDuplicates = (groups: string[][]): number => {
    if (!groups || groups.length === 0) return 0;
    const byComment = new Map<string, LorebookEntry[]>();
    for (const e of lorebook.entries) {
      const c = (e.comment || '').trim();
      const a = byComment.get(c); if (a) a.push(e); else byComment.set(c, [e]);
    }
    const toRemove = new Set<number>();
    const keyUpdates = new Map<number, string[]>();
    for (const group of groups) {
      const members = Array.from(new Set(group.flatMap(n => byComment.get(String(n).trim()) || [])));
      if (members.length < 2) continue;
      members.sort((a, b) => (b.content || '').length - (a.content || '').length); // giữ bản dài nhất
      const keep = members[0];
      const keys = new Set<string>(keep.key || []);
      for (let i = 1; i < members.length; i++) {
        (members[i].key || []).forEach(k => keys.add(k));
        toRemove.add(members[i].uid);
      }
      keyUpdates.set(keep.uid, Array.from(keys));
    }
    if (toRemove.size === 0) return 0;
    setLorebook(prev => ({
      ...prev,
      entries: prev.entries
        .filter(e => !toRemove.has(e.uid))
        .map(e => keyUpdates.has(e.uid) ? { ...e, key: keyUpdates.get(e.uid)! } : e)
    }));
    if (selectedUid !== null && toRemove.has(selectedUid)) setSelectedUid(null);
    return toRemove.size;
  };

  // Xóa TẤT CẢ mục khỏi giao diện (chỉ dọn lorebook đang hiển thị + bộ nhớ tự lưu;
  // KHÔNG đụng tới Wiki gốc hay file đã export). Giải quyết tình trạng "dính entry cũ".
  const handleClearAllEntries = () => {
    if (lorebook.entries.length === 0) return;
    if (!window.confirm(`Xóa toàn bộ ${lorebook.entries.length} mục khỏi giao diện?\n(Không ảnh hưởng Wiki gốc; chỉ dọn danh sách hiện tại. Bộ nhớ tự lưu cũng được reset để không hiện lại khi mở lại.)`)) return;
    setLorebook(prev => ({ ...prev, entries: [] }));
    setSelectedUid(null);
    // autosave effect sẽ ghi trạng thái rỗng vào localStorage + file → mở lại KHÔNG còn entry cũ.
  };

  const handleAIInsert = (data: Partial<LorebookEntry>) => {
    if (selectedUid === null) return;
    const entry = lorebook.entries.find(e => e.uid === selectedUid);
    if (entry) {
      handleUpdateEntry({
        ...entry,
        ...data,
      });
    }
  };

  const handleTranslationUpdate = (translatedEntries: LorebookEntry[]) => {
    setLorebook(prev => ({ ...prev, entries: translatedEntries }));
  };

  const handleOptimizeAllEntries = async () => {
    if (!settings.apiKey) {
      setOptimizeError("Vui lòng thiết lập API Key trong cài đặt (nhấn biểu tượng bánh răng cưa ở trên cùng bên phải) trước khi sử dụng tính năng tối ưu bằng AI.");
      return;
    }

    if (lorebook.entries.length === 0) {
      setOptimizeError("Không có mục nào trong Lorebook hiện tại để phân tích tối ưu.");
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      const optimizedResults = await optimizeEntireLorebook(lorebook.entries, settings);
      
      // Store the analysis results pending user confirmation
      setPendingOptimizationResults(optimizedResults);
    } catch (error: any) {
      console.error("Optimize execution failed:", error);
      setOptimizeError(error.message || "Đã xảy ra sự cố trong quá trình phân loại sâu bằng AI.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (!pendingOptimizationResults) return;

    const optimizedEntries = lorebook.entries.map(entry => {
      const rec = pendingOptimizationResults.find(item => item.uid === entry.uid);
      if (rec) {
        return {
          ...entry,
          position: rec.position,
          scan_depth: rec.scan_depth,
          order: rec.order,
          prevent_recursion: rec.prevent_recursion,
          non_recursable: rec.non_recursable,
          delay_until_recursion: rec.delay_until_recursion,
          ignore_budget: rec.ignore_budget,
          constant: rec.constant,
          selective: rec.selective,
          vectorized: (rec.constant || rec.selective) ? false : entry.vectorized
        };
      }
      return entry;
    });

    setLorebook(prev => ({
      ...prev,
      entries: optimizedEntries
    }));

    setOptimizeResultCount(pendingOptimizationResults.length);
    setPendingOptimizationResults(null);
    setIsOptimizeConfirmOpen(false);
  };

  // --- Tawa Worldbuilding Action Handler ---
  const handleWorldbuildingActions = (actions: WorldbuildingAction[]) => {
    setLorebook(currentLorebook => {
      let nextEntries = [...currentLorebook.entries];
      // Tối ưu: dựng Set tên + maxUid 1 LẦN (tránh O(n²) khi lorebook 1000+ mục).
      const seenComments = new Set(nextEntries.map(e => e.comment?.trim().toLowerCase()).filter(Boolean));
      let runningMaxUid = nextEntries.reduce((m, e) => Math.max(m, e.uid || 0), 0);

      actions.forEach(action => {
        if (action.type === 'create' && action.data) {
          // Check existing duplicates (trimmed and case-insensitive) — O(1) qua Set
          const newComment = action.data.comment?.trim().toLowerCase();
          if (newComment) {
            if (seenComments.has(newComment)) {
              console.warn(`[Data Preservation] Entry "${action.data.comment}" already exists. Skipping duplicate creation.`);
              return;
            }
            seenComments.add(newComment);
          }

          // UID mới — tăng dần, không quét lại mảng
          const newUid = ++runningMaxUid;

          // Clean keywords
          let cleanKeys: string[] = [];
          if (action.data && Array.isArray(action.data.key)) {
            cleanKeys = action.data.key
              .map((k: any) => String(k).trim())
              .filter(Boolean);
            cleanKeys = Array.from(new Set(cleanKeys));
          }

          // Default template (uid được ép lại SAU spread bên dưới để chống AI ghi đè)
          const template: LorebookEntry = {
            secondary_keys: [],
            comment: 'New Entry',
            content: '',
            constant: false,
            selective: true,
            vectorized: false,
            key_logic: 'and_any',
            order: 100,
            position: 'before_char',
            scan_depth: action.data?.scan_depth !== undefined 
              ? action.data.scan_depth 
              : ((action.data?.selective ?? true) ? 2 : 4),
            case_sensitive: false,
            match_whole_words: true,
            delay_until_recursion: false,
            ignore_budget: false,
            priority: 0,
            sticky: 0,
            cooldown: 0,
            delay: 0,
            probability: 0,
            enabled: true,
            ...action.data, // Spread AI data over template
            uid: newUid, // ÉP uid SAU spread → AI lỡ trả uid/uid trùng không phá selection trong app
            key: cleanKeys, // Enforce cleaned keys
            prevent_recursion: true, // Force recursion prevention per guide
            non_recursable: true // Force recursion prevention per guide
          } as LorebookEntry;
          
          nextEntries.push(template);
        }

        if (action.type === 'update' && action.target_comment && action.data) {
          // Strict block on updating any existing entry to comply with Data Preservation Rules
          console.warn(`[Data Preservation] Update action blocked: Cannot modify existing entry "${action.target_comment}".`);
          return;
        }

        if (action.type === 'delete' && action.target_comment) {
          // Strict block on deleting any existing entry to comply with Data Preservation Rules
          console.warn(`[Data Preservation] Delete action blocked: Cannot delete existing entry "${action.target_comment}".`);
          return;
        }
      });

      return { ...currentLorebook, entries: nextEntries };
    });
  };

  // --- Import / Export Logic ---
  const handleExport = () => {
    const exportEntries: Record<string, any> = {};
    lorebook.entries.forEach((entry, index) => {
      // Mapping logic preserved from previous file...
      let pos = 0; let role = null; let logic = 0;
      switch(entry.position) { case 'before_char': pos = 0; break; case 'after_char': pos = 1; break; case 'before_an': pos = 2; break; case 'after_an': pos = 3; break; case 'before_em': pos = 5; break; case 'after_em': pos = 6; break; case 'at_depth_system': pos = 4; role = 0; break; case 'at_depth_user': pos = 4; role = 1; break; case 'at_depth_assistant': pos = 4; role = 2; break; default: pos = 0; }
      switch(entry.key_logic) { case 'and_any': logic = 0; break; case 'and_all': logic = 1; break; case 'not_any': logic = 2; break; case 'not_all': logic = 3; break; default: logic = 0; }

      exportEntries[index.toString()] = {
        uid: index, key: entry.key, keysecondary: entry.secondary_keys, comment: entry.comment, content: entry.content,
        constant: entry.constant, vectorized: entry.vectorized, selective: entry.selective, selectiveLogic: logic,
        addMemo: true, order: entry.order, position: pos, disable: !entry.enabled, ignoreBudget: entry.ignore_budget,
        excludeRecursion: false, preventRecursion: entry.prevent_recursion, delayUntilRecursion: entry.delay_until_recursion ? 0 : false,
        probability: entry.probability || 100, useProbability: true, depth: entry.scan_depth || 4,
        caseSensitive: entry.case_sensitive, matchWholeWords: entry.match_whole_words, sticky: entry.sticky || 0, cooldown: entry.cooldown || 0, delay: entry.delay || 0,
        role: role
      };
    });
    const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ entries: exportEntries, name: lorebook.name }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${lorebook.name || "SillyLore"}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        let rawEntries: any[] = [];
        let bookName = json.name || file.name.replace('.json', '');
        if (json.entries) {
          if (Array.isArray(json.entries)) rawEntries = json.entries;
          else if (typeof json.entries === 'object') rawEntries = Object.keys(json.entries).sort((a, b) => parseInt(a) - parseInt(b)).map(k => json.entries[k]);
        }
        if (rawEntries.length > 0) {
          const normalizedEntries = rawEntries.map((entry: any, index: number) => {
             // Mapping Logic (Reversed)
             let positionStr: any = 'before_char';
             const p = entry.position; const r = entry.role;
             if (p === 0) positionStr = 'before_char'; else if (p === 1) positionStr = 'after_char'; else if (p === 2) positionStr = 'before_an'; else if (p === 3) positionStr = 'after_an'; else if (p === 5) positionStr = 'before_em'; else if (p === 6) positionStr = 'after_em'; else if (p === 4) { if (r === 0) positionStr = 'at_depth_system'; else if (r === 1) positionStr = 'at_depth_user'; else if (r === 2) positionStr = 'at_depth_assistant'; }
             
             let logicStr: any = 'and_any';
             const l = entry.selectiveLogic;
             if (l === 1) logicStr = 'and_all'; else if (l === 2) logicStr = 'not_any'; else if (l === 3) logicStr = 'not_all';

             return {
                uid: Date.now() + index, key: entry.key || [], secondary_keys: entry.keysecondary || entry.secondary_keys || [],
                comment: entry.comment || `Entry #${index + 1}`, content: entry.content || '', position: positionStr, key_logic: logicStr,
                enabled: entry.disable !== undefined ? !entry.disable : (entry.enabled ?? true), constant: entry.constant ?? false,
                selective: entry.selective ?? true, vectorized: entry.vectorized ?? false, order: entry.order ?? 100, scan_depth: entry.depth ?? entry.scan_depth ?? 4,
                case_sensitive: entry.caseSensitive ?? entry.case_sensitive ?? false, match_whole_words: entry.matchWholeWords ?? entry.match_whole_words ?? true,
                prevent_recursion: entry.preventRecursion ?? entry.prevent_recursion ?? false, delay_until_recursion: !!entry.delayUntilRecursion,
                ignore_budget: entry.ignoreBudget ?? entry.ignore_budget ?? false, sticky: entry.sticky ?? 0, cooldown: entry.cooldown ?? 0, delay: entry.delay ?? 0, probability: entry.probability ?? 0,
                non_recursable: false, priority: 0
             };
          });
          setLorebook({ name: bookName, description: json.description || '', entries: normalizedEntries });
          setSelectedUid(null);
        }
      } catch (err) { alert("Lỗi đọc file JSON."); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const selectedEntry = lorebook.entries.find(e => e.uid === selectedUid) || null;

  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden font-sans">
      {/* Cảnh báo bộ nhớ gần đầy (localStorage) */}
      {storageWarning && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 text-amber-100 text-xs px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-30">
          <span className="flex items-center gap-2">⚠️ {storageWarning}</span>
          <button
            onClick={() => setStorageWarning(null)}
            className="text-amber-300 hover:text-amber-100 font-bold px-2 py-0.5 rounded hover:bg-amber-900/50 shrink-0"
          >
            Ẩn
          </button>
        </div>
      )}
      {/* Top Bar */}
      <header className="h-14 bg-surface border-b border-slate-700 flex items-center justify-between px-4 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
             <BookOpen size={18} className="text-white"/>
          </div>
          <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 hidden md:block">
            Tawa Worldbuilder
          </h1>

          {/* View Switcher */}
          <div className="ml-4 flex bg-slate-900 rounded-lg p-1 border border-slate-700">
             <button 
                onClick={() => setActiveView('editor')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition-all ${activeView === 'editor' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Edit size={14} /> Editor
             </button>
             <button 
                onClick={() => setActiveView('worldbuilding')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition-all ${activeView === 'worldbuilding' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <MessageSquare size={14} /> Tawa Worldbuilder
             </button>
          </div>
        </div>

        {/* Beautiful Elegant 3107Ver Badge - Sharp, Solid, Clean (Inter Font) */}
        <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
          <div className="flex items-center gap-2.5 px-3.5 py-1 bg-slate-900 border border-indigo-500/30 rounded-full select-none shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-indigo-200 text-xs font-extrabold tracking-wider uppercase">3107 + SKY</span>
            <span className="text-[9px] font-mono text-indigo-400 font-black tracking-normal ml-0.5 px-1.5 py-0.5 bg-indigo-950/40 border border-indigo-500/25 rounded uppercase">V4.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
           <input 
             type="text" 
             value={lorebook.name}
             onChange={(e) => setLorebook({...lorebook, name: e.target.value})}
             className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm w-32 md:w-48 text-center"
             placeholder="Tên Lorebook"
           />
            <div className="h-6 w-px bg-slate-700 mx-1"></div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('/lorebook-formatter/', '_blank', 'noopener,noreferrer')}
              icon={<BookOpen size={14}/>}
              className="px-3 bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/60 hover:border-emerald-400/60"
              title="Mở SillyTavern Lorebook Formatter"
            >
              <span className="hidden md:inline">Check LB</span>
            </Button>
           
           <label className="cursor-pointer p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Nhập JSON">
             <Upload size={18} />
             <input type="file" accept=".json, .txt" className="hidden" onChange={handleImport} />
           </label>

           <Button variant="primary" size="sm" onClick={handleExport} icon={<Download size={14} className="hidden md:inline"/>} className="px-3">
             <span className="hidden md:inline">Xuất JSON</span>
           </Button>

           <Button 
             variant="primary" 
             size="sm" 
             onClick={() => setIsTranslationOpen(true)} 
             icon={<Languages size={14}/>} 
             className="px-3 bg-gradient-to-r from-blue-600 to-indigo-600 border-none hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
             title="Dịch toàn bộ Lorebook"
           >
             <span className="hidden md:inline">Dịch</span>
           </Button>

           <Button 
             variant="primary" 
             size="sm" 
             onClick={() => setIsOptimizeConfirmOpen(true)} 
             icon={<Zap size={14}/>} 
             className="px-3 bg-gradient-to-r from-amber-500 to-orange-600 border-none hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20"
             title="Áp dụng Sơ đồ 5 Nhóm tối ưu cho toàn bộ mục"
           >
             <span className="hidden md:inline">Sơ đồ tối ưu</span>
           </Button>

           <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} title="Cài đặt AI">
             <Settings size={18} />
           </Button>

           <Button variant="ghost" size="sm" onClick={() => setIsGuideOpen(true)} title="Hướng dẫn sử dụng">
             <HelpCircle size={18} />
           </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Always Visible: Lorebook List) */}
        <LorebookList 
          entries={lorebook.entries}
          selectedId={selectedUid}
          onSelect={(uid) => {
             setSelectedUid(uid);
             if (activeView === 'worldbuilding') setActiveView('editor'); // Auto switch back to edit when selecting
          }}
          onAdd={handleAddEntry}
          onDelete={setDeleteConfirmId}
          onDuplicate={handleDuplicateEntry}
          onClearAll={handleClearAllEntries}
        />
        
        {/* Right Content Area — CẢ 2 view LUÔN MOUNT, chỉ ẩn/hiện bằng CSS.
            → Đổi tab / bấm vào entry KHÔNG unmount WorldbuildingChat nên pipeline
            đang chạy KHÔNG bị mất. (Entry tạo ra cũng tự lưu localStorage/file.) */}
        <div className="flex-1 flex overflow-hidden" style={{ display: activeView === 'editor' ? 'flex' : 'none' }}>
          <EntryEditor
            entry={selectedEntry}
            onChange={handleUpdateEntry}
            onOpenAI={() => setIsAIGeneratorOpen(true)}
            settings={settings}
          />
        </div>
        <div className="flex-1 flex bg-slate-950/50 relative overflow-hidden" style={{ display: activeView === 'worldbuilding' ? 'flex' : 'none' }}>
             <div className="absolute inset-0 bg-[url('https://files.catbox.moe/o82o4z.png')] bg-cover bg-center opacity-40 pointer-events-none"></div>
             <div className="flex flex-row h-full w-full justify-center relative z-10 overflow-hidden">
                <WikiCollector
                   onApplyWikiData={(title, content, url) => {
                     setWikiDataToFeed({ name: title, content: content });
                   }}
                   isChatLoading={false}
                   settings={settings}
                />
                <div className="flex-1 max-w-3xl h-full flex justify-center">
                   <WorldbuildingChat
                      lorebook={lorebook}
                      settings={settings}
                      messages={chatMessages}
                      setMessages={setChatMessages}
                      onApplyActions={handleWorldbuildingActions}
                      onMergeDuplicates={handleMergeDuplicates}
                      wikiDataToFeed={wikiDataToFeed}
                      onClearWikiData={() => setWikiDataToFeed(null)}
                       pipelineToAnalyze={pipelineToAnalyze}
                       onClearPipelineToAnalyze={() => setPipelineToAnalyze(null)}
                   />
                </div>
             </div>
        </div>
      </div>

      {/* Modals */}
      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
        getDefaults={() => buildSettings(null)}
        storageDir={storageDir}
        onAnalyzePipeline={(steps) => {
          setPipelineToAnalyze(steps);
          setActiveView('worldbuilding');
          setIsSettingsOpen(false);
        }}
      />

      <AIGeneratorModal 
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        settings={settings}
        onGenerate={handleAIInsert}
      />

      <TranslationModal 
        isOpen={isTranslationOpen}
        onClose={() => setIsTranslationOpen(false)}
        entries={lorebook.entries}
        settings={settings}
        onUpdateEntries={handleTranslationUpdate}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirmId !== null} 
        onClose={() => setDeleteConfirmId(null)} 
        title="Xác nhận xóa"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
             <Button variant="danger" onClick={handleDeleteEntry}>Xóa vĩnh viễn</Button>
          </div>
        }
      >
        <p className="text-slate-300">
          Bạn có chắc chắn muốn xóa mục này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* Optimize Confirmation Modal */}
      <Modal 
        isOpen={isOptimizeConfirmOpen} 
        onClose={isOptimizing ? () => {} : () => { setIsOptimizeConfirmOpen(false); setPendingOptimizationResults(null); setOptimizeError(null); }} 
        title={pendingOptimizationResults ? "Xác nhận Sơ đồ Tối ưu hóa 5 Nhóm từ Tawa" : "Áp dụng Sơ đồ Tối ưu hóa 5 Nhóm"}
        size={pendingOptimizationResults ? "lg" : "md"}
        footer={
          <div className="flex justify-end gap-3">
             {pendingOptimizationResults ? (
               <>
                 <Button variant="ghost" onClick={() => { setPendingOptimizationResults(null); setOptimizeError(null); }} disabled={isOptimizing}>Phân tích lại</Button>
                 <Button 
                   variant="primary" 
                   className="bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/25 flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm transition-all border-none animate-pulse" 
                   onClick={handleApplyOptimization}
                 >
                   <Zap size={14} className="fill-slate-950" />
                   Xác nhận Áp Dụng Ngay Lập Tức
                 </Button>
               </>
             ) : (
               <>
                 <Button variant="ghost" onClick={() => { setIsOptimizeConfirmOpen(false); setOptimizeError(null); }} disabled={isOptimizing}>Hủy bỏ</Button>
                 <Button 
                   variant="primary" 
                   className="bg-gradient-to-r from-amber-500 to-orange-600 border-none hover:from-amber-400 hover:to-orange-500 shadow-md flex items-center gap-2" 
                   onClick={handleOptimizeAllEntries} 
                   disabled={isOptimizing}
                   icon={isOptimizing ? <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span> : <Zap size={14}/>}
                 >
                   {isOptimizing ? "Tawa đang phân loại..." : "Bắt đầu phân tích bằng AI"}
                 </Button>
               </>
             )}
          </div>
        }
      >
        <div className="space-y-4 text-sm text-slate-300 font-sans">
          {optimizeError && (
            <div className="p-3 bg-red-950/50 border border-red-500/35 text-red-200 text-xs rounded-lg leading-relaxed font-sans shadow-md animate-pulse">
              <span className="font-bold block mb-1 text-red-400">⚠️ Phát sinh sự cố:</span>
              {optimizeError}
            </div>
          )}

          {isOptimizing ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-4 bg-slate-950/45 rounded-lg border border-indigo-500/20 shadow-inner">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
                <Zap className="absolute text-amber-400 animate-pulse" size={24} />
              </div>
              <div className="text-center space-y-1.5 px-6">
                <h4 className="text-sm font-extrabold text-indigo-300 tracking-wider uppercase">Tawa đang phân tích chuyên sâu</h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Đang quét song song và đối chiếu chéo toàn bộ <span className="font-bold text-slate-100">{lorebook.entries.length}</span> mục bằng AI để phân bổ chuẩn xác nhất, tránh mọi nhầm lẫn cấu trúc...
                </p>
              </div>
            </div>
          ) : pendingOptimizationResults ? (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 shrink-0 text-amber-400">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Tawa đã phân tích xong sơ đồ tối ưu 5 Nhóm!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Chuẩn hóa cấu trúc theo tiêu chuẩn <span className="text-amber-300 font-bold">OrderLorebook</span>. Dưới đây là đề xuất chi tiết dành riêng cho con. Các mục bị lỗi/chưa phân nhóm sẽ được Tawa sắp xếp lại chính xác ngay lập tức sau khi con nhấn xác nhận.
                  </p>
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/50">
                {lorebook.entries.map((entry) => {
                  const rec = pendingOptimizationResults.find(item => item.uid === entry.uid);
                  if (!rec) return null;

                  // Evaluate if entry is structurally mismatched currently
                  const isG1 = entry.order === 1 && entry.position === 'before_char' && entry.scan_depth === 4 && entry.constant === true && entry.selective === false && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isG2 = entry.order === 4 && entry.position === 'before_char' && entry.scan_depth === 4 && entry.constant === true && entry.selective === false && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isG3 = entry.order === 99 && entry.position === 'after_char' && entry.scan_depth === 2 && entry.constant === false && entry.selective === true && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isG4 = entry.order === 80 && entry.position === 'after_char' && entry.scan_depth === 2 && entry.constant === false && entry.selective === true && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isG5 = entry.order === 100 && entry.position === 'after_char' && entry.scan_depth === 2 && entry.constant === false && entry.selective === true && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isGD0 = entry.order === 1 && entry.position === 'at_depth_system' && entry.scan_depth === 0 && entry.constant === false && entry.selective === true && entry.prevent_recursion === true && entry.non_recursable === true;
                  const isCurrentValid = isG1 || isG2 || isG3 || isG4 || isG5 || isGD0;

                  return (
                    <div 
                      key={entry.uid} 
                      className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-with-all duration-200 ${
                        !isCurrentValid 
                          ? "bg-red-950/20 border-red-500/30 hover:border-red-500/50 shadow-sm" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1 md:max-w-[60%]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{entry.comment || "Không có tên"}</span>
                          <span className="text-slate-500 font-mono">#{entry.uid}</span>
                          {!isCurrentValid ? (
                            <span className="px-1.5 py-0.5 bg-red-900/40 border border-red-500/40 text-red-350 text-[10px] rounded font-extrabold animate-pulse">
                              ⚠️ Lệch chuẩn
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] rounded">
                              ✓ Cấu trúc chuẩn
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 leading-relaxed font-sans mt-1">
                          <p className="text-slate-500 text-[11px]">
                            Hiện đang có: <span className="font-mono text-slate-300">{entry.order} | {entry.position} | Depth {entry.scan_depth} | {entry.constant ? "Hằng số" : "Từ khóa"}</span>
                          </p>
                          <p className="text-amber-400 font-medium text-[11px] mt-0.5">
                            ➔ Đề nghị của Tawa: <span className="underline">{rec.categoryName}</span>
                          </p>
                          <p className="text-slate-400 text-[10px] italic mt-1 leading-normal">
                             "{rec.reason}"
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-950/85 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1 text-[10px] md:min-w-[170px] shrink-0 font-mono">
                        <div className="font-bold text-slate-400 uppercase tracking-widest text-[8px] mb-0.5 border-b border-slate-800 pb-0.5">Cơ cấu OrderLorebook mới</div>
                        <div className="flex justify-between"><span className="text-slate-500">Thứ tự chèn (Order):</span> <span className="font-bold font-mono text-amber-400">{rec.order}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Vị trí (Position):</span> <span className="font-semibold text-sky-400">{rec.position}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Độ sâu (Depth):</span> <span className="font-bold font-mono text-emerald-400">{rec.scan_depth}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Chặn đệ quy:</span> <span className={rec.prevent_recursion ? "text-emerald-400 font-bold animate-pulse" : "text-slate-600"}>{rec.prevent_recursion ? "BẬT" : "TẮT"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Kích hoạt:</span> <span className="font-medium text-purple-400">{rec.constant ? "Hằng số" : "Từ khóa"}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <p>
                Hệ thống sẽ chuyển toàn bộ <span className="font-bold text-amber-400 text-base">{lorebook.entries.length}</span> mục hiện có sang cho **mô hình AI (Gemini/OpenAI)**. AI sẽ tự động đối chiếu chéo bối cảnh để phân bổ chuẩn xác tuyệt đối theo sơ đồ 5 Nhóm SillyTavern:
              </p>
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-lg border border-slate-700/50 text-xs text-slate-400">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="font-semibold text-slate-200">Nhóm 1: Thế giới quan & Tổng cương</span>
                  <span className="font-mono text-indigo-400 bg-indigo-950/40 px-1 rounded animate-pulse">Order 1 • Before Char • Constant</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="font-semibold text-slate-200">Nhóm 2: Xem lướt nhân vật & thế lực</span>
                  <span className="font-mono text-indigo-400 bg-indigo-950/40 px-1 rounded">Order 4 • Before Char • Constant</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="font-semibold text-slate-200">Nhóm 3: Chi tiết nhân vật cốt lõi</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1 rounded">Order 99 • After Char (Depth 2) • Selective</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="font-semibold text-slate-200">Nhóm 4: Cảnh vật & Chi tiết sự kiện</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1 rounded">Order 80 • After Char (Depth 2) • Selective</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="font-semibold text-slate-200">Nhóm 5: Tài liệu NPC</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1 rounded">Order 100 • After Char (Depth 2) • Selective</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-200">Nhóm Đặc Biệt: Giải thích lần hai (D0)</span>
                  <span className="font-mono text-purple-400 bg-purple-950/40 px-1 rounded">Order 1 • System (Depth 0) • Selective</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs italic leading-relaxed">
                * Quá trình phân loại cấu trúc chuẩn hóa tự động chặn đệ quy (prevent_recursion & non_recursable = true) cho tất cả các mục để chống sập token. Độ sâu quét từ khóa được tự động định cấu hình tối ưu để AI phản hồi nhanh và mượt mà nhất.
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Optimize Result Modal */}
      <Modal 
        isOpen={optimizeResultCount !== null} 
        onClose={() => setOptimizeResultCount(null)} 
        title="Tối ưu hóa hoàn tất!"
        size="sm"
        footer={
          <div className="flex justify-end">
             <Button variant="primary" onClick={() => setOptimizeResultCount(null)}>Tuyệt vời</Button>
          </div>
        }
      >
        <div className="text-center py-4 space-y-3 font-sans">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 shrink-0 mx-auto">
            <Zap className="text-green-400" size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-100 font-sans">Cấu hình thành công!</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Đã đồng bộ hóa và tối ưu cấu hình cho tất cả <span className="font-bold text-green-400">{optimizeResultCount}</span> mục trong Lorebook theo đúng tiêu chuẩn 5 Nhóm SillyTavern.
          </p>
        </div>
      </Modal>

    </div>
  );
};

export default App;
