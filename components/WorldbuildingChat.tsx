
import React, { useState, useRef, useEffect } from 'react';
import { Lorebook, OpenAISettings, ChatMessage, WorldbuildingAction, WorldbuildingMode } from '../types';
import { worldbuildingChat } from '../services/openai';
import { runRateLimited } from '../utils/rateLimiter';
import { Button } from './ui/Button';
import { Send, Bot, User, Loader2, Sparkles, PlusCircle, Edit3, Trash2, Image as ImageIcon, X, CornerDownLeft, Dna, Layers, MessageSquare, FileText, Wand2, ChevronLeft, ChevronRight, Clock, Cpu, Activity } from 'lucide-react';

interface WorldbuildingChatProps {
  lorebook: Lorebook;
  settings: OpenAISettings;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onApplyActions: (actions: WorldbuildingAction[]) => void;
  wikiDataToFeed?: { name: string; content: string } | null;
  onClearWikiData?: () => void;
  pipelineToAnalyze?: any[] | null;
  onClearPipelineToAnalyze?: () => void;
}

export const WorldbuildingChat: React.FC<WorldbuildingChatProps> = ({
  lorebook,
  settings,
  messages,
  setMessages,
  onApplyActions,
  wikiDataToFeed,
  onClearWikiData,
  pipelineToAnalyze,
  onClearPipelineToAnalyze
}) => {
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<{name: string, content: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [mode, setMode] = useState<WorldbuildingMode>(() => {
    const savedMode = localStorage.getItem('sillyLore_worldbuilding_mode');
    return (savedMode as WorldbuildingMode) || 'genesis';
  });

  useEffect(() => {
    localStorage.setItem('sillyLore_worldbuilding_mode', mode);
  }, [mode]);




  const MODES: { id: WorldbuildingMode; label: string; icon: React.ReactNode; color: string; title: string }[] = [
    { id: 'genesis', label: 'Genesis (Mới)', icon: <Sparkles size={14} />, color: 'bg-indigo-600 shadow-lg shadow-indigo-500/30', title: 'Chế độ Khởi Nguyên: Sử dụng Template chuẩn để tạo mới.' },
    { id: 'evolution', label: 'Evolution (Sửa/Wiki)', icon: <Dna size={14} />, color: 'bg-emerald-600 shadow-lg shadow-emerald-500/30', title: 'Chế độ Tiến Hóa & Auto Wiki: Phân tích phong cách, tải dữ liệu từ Wiki/Fandom và tạo/sửa Lorebook.' },
    { id: 'document_extraction', label: 'Document (Đọc File)', icon: <FileText size={14} />, color: 'bg-amber-600 shadow-lg shadow-amber-500/30', title: 'Chế độ Đọc File: Tự động đọc file .txt dung lượng lớn và tạo Lorebook.' },
    { id: 'discussion', label: 'Discussion (Chat)', icon: <MessageSquare size={14} />, color: 'bg-pink-600 shadow-lg shadow-pink-500/30', title: 'Chế độ Thảo luận: Chỉ trò chuyện, không tạo Entry.' },
    { id: 'rework', label: 'Rework (Prompt OP)', icon: <Wand2 size={14} />, color: 'bg-purple-600 shadow-lg shadow-purple-500/30', title: 'Chế độ Rework: Tự động cải thiện & tối ưu hóa prompt của người dùng.' }
  ];

  const activeModeIndex = MODES.findIndex(m => m.id === mode);
  const currentModeInfo = MODES[activeModeIndex !== -1 ? activeModeIndex : 0];

  const handleNextMode = () => {
    const nextIndex = (activeModeIndex + 1) % MODES.length;
    setMode(MODES[nextIndex].id);
  };

  const handlePrevMode = () => {
    const prevIndex = (activeModeIndex - 1 + MODES.length) % MODES.length;
    setMode(MODES[prevIndex].id);
  };

  // Pipeline execution states
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineCurrentStepIndex, setPipelineCurrentStepIndex] = useState(0);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineSubLoading, setPipelineSubLoading] = useState(false);
  const pipelineRef = useRef<boolean>(false);
  
  // Custom interactive approval & error retry states
  const [pipelineWaitingConfirmation, setPipelineWaitingConfirmation] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const pipelineApprovalResolverRef = useRef<((action: 'approve' | 'retry') => void) | null>(null);

  // --- Trực quan hóa tiến trình thời gian thực (timer + luồng đang chạy + model) ---
  const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
  const [pipelineElapsed, setPipelineElapsed] = useState(0); // giây
  // chunkStats: tiến độ TRONG 1 bước — done/total mảnh, số luồng đang chạy, model nào.
  const [chunkStats, setChunkStats] = useState<{ done: number; total: number; running: number; model: string }>({ done: 0, total: 0, running: 0, model: '' });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const DEFAULT_WORLDBUILDING_STEPS = [
    {
      id: 'step_1',
      name: 'Bước 1: Thế giới quan & Tổng cương',
      prompt: 'Hãy phân tích kĩ lưỡng toàn bộ tài liệu Wiki được cung cấp để tìm kiếm bối cảnh lịch sử lập quốc, tôn giáo vĩ mô, các học thuyết ma pháp, định luật sức mạnh cốt lõi, quy tắc thế giới vĩ mô. Tạo ra các Lorebook Entry chi tiết cho Nhóm 1 (Thế giới quan & Tổng cương) với Vị trí before_char, Thứ tự Order 1-3, và Chiến lược Constant (constant: true, selective: false).',
      enabled: true
    },
    {
      id: 'step_2',
      name: 'Bước 2: Phe phái, Tổ chức & Xem lướt nhân vật',
      prompt: 'Trích xuất thông tin về các phe phái chính trị, gia tộc, bang hội, tổ chức xã hội và danh sách toàn bộ nhân vật có mặt trong thế giới. Tạo ra mục Xem lướt nhân vật & thế lực ở Nhóm 2 với Vị trí before_char, Thứ tự Order 4, và Chiến lược Constant (constant: true, selective: false).',
      enabled: true
    },
    {
      id: 'step_3',
      name: 'Bước 3: Cảnh vật & Chi tiết địa danh',
      prompt: 'Dựa trên tài liệu Wiki, hãy trích xuất các địa danh vật lý, phòng ốc, dinh thự, live house, cảnh quan chi tiết. Tạo các mục chi tiết ở Nhóm 4 (Cảnh vật & Chi tiết sự kiện) với Vị trí after_char, Thứ tự Order 80, và Chiến lược Selective (constant: false, selective: true) có scan_depth = 2.',
      enabled: true
    },
    {
      id: 'step_4',
      name: 'Bước 4: Hồ sơ nhân vật chi tiết & Chống bỏ sót mổ xẻ 100%',
      prompt: 'Đồng bộ hóa 100% hồ sơ của các nhân vật chính/cốt lõi và tài liệu NPC phụ có mặt trong tài liệu Wiki. Tạo ra các mục ở Nhóm 3 (Chi tiết nhân vật cốt lõi - Order 99) hoặc Nhóm 5 (Tài liệu NPC - Order 100) tương ứng ở Vị trí after_char, Chiến lược Selective (constant: false, selective: true) có scan_depth = 2. Rà soát lại toàn bộ Wiki để đảm bảo mổ xẻ kĩ lưỡng 100% thông tin không bị sót bất kì yếu tố nào.',
      enabled: true
    }
  ];

  const handleStartPipeline = () => {
    if (!selectedDocument) return;
    pipelineRef.current = true;
    runPipeline(selectedDocument);
  };

  const handleStopPipeline = () => {
    pipelineRef.current = false;
    setPipelineRunning(false);
    setPipelineSubLoading(false);
    setPipelineWaitingConfirmation(false);
    setPipelineError(null);
    setPipelineLogs(prev => [...prev, `[Hệ thống] Hủy bỏ quy trình bởi người dùng.`]);
  };

  useEffect(() => {
    return () => {
      pipelineRef.current = false;
    };
  }, []);

  // Bộ đếm thời gian: tick mỗi giây khi pipeline đang chạy.
  useEffect(() => {
    if (!pipelineRunning || !pipelineStartTime) return;
    const id = setInterval(() => {
      setPipelineElapsed(Math.floor((Date.now() - pipelineStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [pipelineRunning, pipelineStartTime]);

  // Danh sách bước đang bật (dùng chung cho render console tiến trình).
  // Super Mix gộp tất cả nhóm thành 1 bước → console cũng hiển thị 1 bước cho khớp.
  const baseEnabledSteps = (settings.steps && settings.steps.length > 0 ? settings.steps : DEFAULT_WORLDBUILDING_STEPS).filter(s => s.enabled);
  const enabledStepList = (settings.superMix && baseEnabledSteps.length > 1)
    ? [{ ...baseEnabledSteps[0], name: `Super Mix: bóc tách TOÀN BỘ ${baseEnabledSteps.length} nhóm trong 1 lượt` }]
    : baseEnabledSteps;
  const enabledStepCount = enabledStepList.length;

  // mm:ss
  const fmtElapsed = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const runPipeline = async (attachedDoc: { name: string; content: string }) => {
    const rawSteps = settings.steps && settings.steps.length > 0
      ? settings.steps
      : DEFAULT_WORLDBUILDING_STEPS;
    let enabledSteps = rawSteps.filter(s => s.enabled);
    if (enabledSteps.length === 0) {
      alert("Vui lòng kích hoạt ít nhất một bước hướng dẫn trong Cài đặt.");
      return;
    }

    // ─── SUPER MIX: gộp tất cả nhóm vào 1 "siêu bước" → đọc tài liệu 1× thay vì 5× ───
    // Mỗi mảnh chỉ gọi API 1 lần để bóc tách ĐỒNG THỜI mọi nhóm → giảm ~5× số request.
    if (settings.superMix && enabledSteps.length > 1) {
      const combined = enabledSteps
        .map((s, idx) => `▸ NHÓM ${idx + 1} — ${s.name}:\n${s.prompt}`)
        .join('\n\n');
      enabledSteps = [{
        id: 'super_mix',
        name: `Super Mix: bóc tách TOÀN BỘ ${enabledSteps.length} nhóm trong 1 lượt`,
        enabled: true,
        prompt: `Trong CÙNG một lượt, hãy trích xuất ĐỒNG THỜI mọi nhóm dưới đây từ phân mảnh. Với MỖI thực thể hợp lệ thuộc BẤT KỲ nhóm nào, tạo 1 entry đúng vị trí/order/chiến lược mà nhóm đó quy định. KHÔNG bỏ sót nhóm nào.\n\n${combined}`,
      }];
    }

    setPipelineRunning(true);
    setPipelineCurrentStepIndex(0);
    setPipelineStartTime(Date.now());
    setPipelineElapsed(0);
    setChunkStats({ done: 0, total: 0, running: 0, model: '' });
    setPipelineLogs([`[Hệ thống] Khởi động động cơ tri thức. Chạy ${enabledSteps.length} bước hướng dẫn AI tự động...`]);
    setPipelineError(null);
    setPipelineWaitingConfirmation(false);

    let currentLorebookState = { ...lorebook, entries: [...lorebook.entries] };
    let currentHistory = [...messages];
    setInput('');

    try {
      for (let i = 0; i < enabledSteps.length; i++) {
        if (!pipelineRef.current) break;
        const currentStep = enabledSteps[i];
        setPipelineCurrentStepIndex(i);
        setPipelineLogs(prev => [...prev, `[Hệ thống] >>> BƯỚC ${i + 1}/${enabledSteps.length}: ${currentStep.name} <<<`]);

        // ════════════════════════════════════════════════════════════════
        // XỬ LÝ BƯỚC: phủ TOÀN BỘ phân mảnh (không bỏ sót) + chạy SONG SONG
        // theo RPM của model CHÍNH. Đây là fix cốt lõi cho "Zero Omission":
        // trước đây chỉ ~15.000 ký tự đầu của tài liệu được xử lý mỗi bước.
        // ════════════════════════════════════════════════════════════════
        const chunkSize = 15000;
        const fullText = attachedDoc.content || '';
        const chunks: string[] = [];
        for (let s = 0; s < fullText.length; s += chunkSize) {
          chunks.push(fullText.slice(s, s + chunkSize));
        }
        if (chunks.length === 0) chunks.push('');

        const primaryModel = settings.model;
        const primaryRpm = settings.primaryRpm || 5;

        const prevStepsMeta = enabledSteps.slice(0, i).map((s, idx) => `Bước ${idx + 1}: ${s.name}`).join(', ');
        const priorNames = currentLorebookState.entries
          .map(e => e.comment).filter(Boolean).slice(-150).join(', ');

        // Reset bộ đếm mảnh cho bước này → progress bar phụ + badge luồng cập nhật ngay.
        setChunkStats({ done: 0, total: chunks.length, running: 0, model: primaryModel });

        setPipelineLogs(prev => [...prev, `[Hệ thống] Bước ${i + 1}: ${chunks.length} phân mảnh • chạy song song theo RPM=${primaryRpm} (model chính: ${primaryModel})`]);

        const masterGuide = (settings.masterInstruction || '').trim();
        const buildChunkPrompt = (chunk: string, ci: number) => `[Quy trình tự động - ${currentStep.name} • Phân mảnh ${ci + 1}/${chunks.length}]

[CHỐNG SKIP] Không được bỏ qua. Trích xuất đầy đủ, KHÔNG bịa thông tin ngoài dữ liệu.

[LOẠI TRỪ DẬP TRÙNG] Các bước đã xong: [${prevStepsMeta || 'chưa có'}]. KHÔNG tạo lại mục đã tồn tại. Tên entry đã có: ${priorNames || 'chưa có'}.
${masterGuide ? `
=== HƯỚNG DẪN TỔNG (quy tắc CHUNG, bám sát cho mọi bước) ===
${masterGuide}
` : ''}
Trọng tâm bước này:
${currentStep.prompt}

Tên tài liệu Wiki: ${attachedDoc.name}

Nội dung phân mảnh #${ci + 1} (CHỈ mổ xẻ phần này):
${chunk}

YÊU CẦU:
1. Trích xuất 100% thực thể HỢP LỆ với bước này có trong phân mảnh → action {"type":"create","data":{...}}.
2. Nếu phân mảnh không có dữ liệu phù hợp, trả "actions": [].
3. Luôn đặt "status": "DONE" (mỗi phân mảnh xử lý gọn trong 1 lượt).`;

        // Factory: 1 task mổ xẻ 1 mảnh bằng MODEL chỉ định (Pro hoặc Flash).
        type ChunkResult = { actions: WorldbuildingAction[]; failed: boolean; error: string };
        const makeTask = (chunk: string, ci: number, model: string) => async (): Promise<ChunkResult> => {
          if (!pipelineRef.current) return { actions: [], failed: false, error: '' };
          // +1 luồng đang chạy (badge "đang chạy N luồng" cập nhật ngay khi mảnh khởi động)
          setChunkStats(p => ({ ...p, running: p.running + 1 }));
          try {
            const resp = await worldbuildingChat(
              buildChunkPrompt(chunk, ci),
              [],
              currentLorebookState,
              settings,
              [],
              undefined,
              settings.minTokens || 4000,
              'evolution',
              model,
              300000 // trần 5 phút + tự hủy nếu stream đứng yên 90s (chống 1 mảnh kẹt treo cả pipeline)
            );
            const acts = (resp?.actions || []).filter((a: any) => a && a.type === 'create' && a.data) as WorldbuildingAction[];
            return { actions: acts, failed: false, error: '' };
          } catch (e: any) {
            const msg = String(e?.message || e || 'Lỗi không xác định');
            console.error(`[Pipeline] Bước ${i + 1} • mảnh ${ci + 1} (${model}) lỗi API:`, e);
            return { actions: [], failed: true, error: msg };
          } finally {
            // -1 luồng, +1 mảnh xong → progress bar phụ tiến lên ngay cả khi mảnh đó rỗng.
            setChunkStats(p => ({ ...p, running: Math.max(0, p.running - 1), done: p.done + 1 }));
          }
        };

        // ─── TĂNG TỐC: chia mảnh cho CẢ Pro + Flash chạy đồng thời ───
        // Nút thắt thật là RPM (chỉ N request được START mỗi phút). Dùng đồng thời
        // 2 model = cộng dồn ngân sách RPM (vd 5 + 10 = 15) → nhanh hơn nhiều.
        // Chia theo TỈ LỆ RPM để 2 bên xong gần cùng lúc (Flash nhiều RPM ⇒ ôm nhiều mảnh hơn).
        // Chế độ Mix (mặc định bật): song công Pro + Flash. Cần có model phụ + API key.
        const useDual = !!(settings.mixMode !== false && settings.enableSecondaryModel && settings.secondaryModel && settings.apiKey);
        const secModel = settings.secondaryModel || '';
        const secRpm = settings.secondaryRpm || 10;

        let settledChunks: PromiseSettledResult<ChunkResult>[];
        if (useDual && chunks.length > 1) {
          const proIdx: number[] = [];
          const flashIdx: number[] = [];
          let proLoad = 0, flashLoad = 0;
          chunks.forEach((_, ci) => {
            // Gán mảnh cho pool nào "rảnh" hơn tương đối với RPM của nó.
            if ((proLoad + 1) / primaryRpm <= (flashLoad + 1) / secRpm) { proIdx.push(ci); proLoad++; }
            else { flashIdx.push(ci); flashLoad++; }
          });
          setChunkStats({ done: 0, total: chunks.length, running: 0, model: `${primaryModel} + ${secModel}` });
          setPipelineLogs(prev => [...prev, `[Tăng tốc] Song công 2 model: Pro ôm ${proIdx.length} mảnh (RPM ${primaryRpm}), Flash ôm ${flashIdx.length} mảnh (RPM ${secRpm}).`]);

          const proTasks = proIdx.map(ci => makeTask(chunks[ci], ci, primaryModel));
          const flashTasks = flashIdx.map(ci => makeTask(chunks[ci], ci, secModel));
          const [proRes, flashRes] = await Promise.all([
            runRateLimited(proTasks, { key: primaryModel, rpm: primaryRpm }),
            runRateLimited(flashTasks, { key: secModel, rpm: secRpm }),
          ]);
          // Ghép kết quả về đúng thứ tự mảnh gốc.
          settledChunks = new Array(chunks.length);
          proIdx.forEach((ci, k) => { settledChunks[ci] = proRes[k]; });
          flashIdx.forEach((ci, k) => { settledChunks[ci] = flashRes[k]; });
        } else {
          const stepTasks = chunks.map((chunk, ci) => makeTask(chunk, ci, primaryModel));
          settledChunks = await runRateLimited(stepTasks, { key: primaryModel, rpm: primaryRpm });
        }
        if (!pipelineRef.current) break;

        // ─── AUTO-RETRY: thử lại 1 lần các mảnh lỗi/timeout, dùng Model CHÍNH (Pro) cho chắc ───
        // Mảnh hay lỗi nhất là mảnh dày bị Flash quá tải hoặc bị timeout → cho Pro làm lại.
        const isBad = (r?: PromiseSettledResult<ChunkResult>) =>
          !r || r.status !== 'fulfilled' || !r.value || r.value.failed;
        const retryIdx = settledChunks
          .map((r, ci) => (isBad(r) ? ci : -1))
          .filter(ci => ci >= 0);
        if (retryIdx.length > 0 && pipelineRef.current) {
          setPipelineLogs(prev => [...prev, `[Retry] Bước ${i + 1}: thử lại ${retryIdx.length} mảnh lỗi bằng model chính (${primaryModel})...`]);
          setChunkStats({ done: 0, total: retryIdx.length, running: 0, model: `${primaryModel} (retry)` });
          const retryTasks = retryIdx.map(ci => makeTask(chunks[ci], ci, primaryModel));
          const retryRes = await runRateLimited(retryTasks, { key: primaryModel, rpm: primaryRpm });
          // Chỉ ghi đè nếu retry KHÁ hơn (thành công); vẫn lỗi thì giữ kết quả cũ.
          retryIdx.forEach((ci, k) => {
            const rr = retryRes[k];
            if (rr && rr.status === 'fulfilled' && rr.value && !rr.value.failed) settledChunks[ci] = rr;
          });
          if (!pipelineRef.current) break;
          const stillBad = retryIdx.filter(ci => isBad(settledChunks[ci])).length;
          setPipelineLogs(prev => [...prev, `[Retry] Bước ${i + 1}: cứu được ${retryIdx.length - stillBad}/${retryIdx.length} mảnh.${stillBad > 0 ? ` Còn ${stillBad} mảnh vẫn lỗi → bỏ qua.` : ''}`]);
        }

        // Gộp TUẦN TỰ (tránh race) + chống trùng theo comment, rồi áp dụng 1 lần.
        const mergedActions: WorldbuildingAction[] = [];
        let failedChunks = 0;
        const errorSamples: string[] = [];
        for (const r of settledChunks) {
          if (r.status !== 'fulfilled' || !r.value) {
            failedChunks++;
            const reason = r.status === 'rejected' ? String((r as any).reason?.message || (r as any).reason) : 'Tác vụ không trả kết quả';
            if (reason) errorSamples.push(reason);
            continue;
          }
          if (r.value.failed) {
            failedChunks++;
            if (r.value.error) errorSamples.push(r.value.error);
          }
          for (const act of r.value.actions) {
            const name = act.data?.comment?.trim().toLowerCase();
            if (name) {
              const dup = currentLorebookState.entries.some(e => e.comment?.trim().toLowerCase() === name)
                || mergedActions.some(a => a.data?.comment?.trim().toLowerCase() === name);
              if (dup) continue;
              currentLorebookState.entries.push(act.data as any);
            }
            mergedActions.push(act);
          }
        }

        if (mergedActions.length > 0) {
          onApplyActions(mergedActions);
          const createdNames = mergedActions.map(a => a.data?.comment).filter(Boolean).join(', ');
          setPipelineLogs(prev => [...prev, `[Tạo mới] Bước ${i + 1}: +${mergedActions.length} mục — ${createdNames}`]);
          currentHistory.push({
            id: `pipeline_a_${Date.now()}_${i}`,
            role: 'assistant',
            content: `Bước ${i + 1} (${currentStep.name}): tạo ${mergedActions.length} entry từ ${chunks.length} phân mảnh.`,
            timestamp: Date.now()
          } as ChatMessage);
          setMessages([...currentHistory]);
        }

        if (failedChunks > 0) {
          // Gom các lý do lỗi khác nhau (tối đa 3 mẫu) để người dùng biết NGUYÊN NHÂN thật
          const distinctErrors = Array.from(new Set(errorSamples)).slice(0, 3);
          const reasonStr = distinctErrors.length > 0 ? ` — Lý do: ${distinctErrors.join(' | ')}` : '';
          setPipelineLogs(prev => [...prev, `[⚠️ LỖI API] Bước ${i + 1}: ${failedChunks}/${chunks.length} phân mảnh lỗi (đã bỏ qua, dữ liệu còn lại vẫn giữ).${reasonStr}`]);
        }

        const cleanStepName = currentStep.name.replace(/^Bước\s+\d+:\s*/i, '');
        setPipelineLogs(prev => [...prev, `✅ Hoàn thành bước [${i + 1}]: thu được ${mergedActions.length} mục về [${cleanStepName}]`]);
      }

      if (pipelineRef.current) {
        setPipelineLogs(prev => [...prev, `[Hệ thống] XONG! Đạt 100% mổ xẻ nội dung.`]);
        setMessages(prev => [...prev, {
          id: `pipeline_complete_${Date.now()}`,
          role: 'assistant',
          content: `✨ **CHÚC MỪNG CHỦ NHÂN!!! TAWA ĐÃ HOÀN THÀNH LOREBOOK 100%!!!** ✨\n\nTawa đã mổ xẻ thành công hoàn toàn **100% thông tin** trong Wiki được cung cấp và chạy trọn vẹn tất cả **${enabledSteps.length} bước hướng dẫn bối cảnh**!\n\nMọi định luật sức mạnh cốt lõi, thế giới quan vĩ mô, bang hội bối cảnh và hồ sơ nhân vật chi tiết đều đã được đồng bộ hóa chỉn chu vào vũ trụ giả tưởng của chúng ta rồi đó nha baka~ 🌸`,
          timestamp: Date.now()
        }]);
      }
    } catch (masterErr: any) {
      setPipelineLogs(prev => [...prev, `[Thất bại] Quy trình buộc dừng lại: ${masterErr.message}`]);
    } finally {
      setPipelineRunning(false);
      setPipelineSubLoading(false);
      setPipelineWaitingConfirmation(false);
      setPipelineError(null);
      setStreamBuffer('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamBuffer]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Load wiki crawler data automatically when passed
  useEffect(() => {
    if (wikiDataToFeed) {
      setSelectedDocument({ name: wikiDataToFeed.name, content: wikiDataToFeed.content });
      setInput(`Tôi đã thu thập toàn bộ dữ liệu Wiki từ '${wikiDataToFeed.name}' và các liên kết phụ liên quan của nó. Hãy quét tài liệu này và tự động phân tích kỹ lưỡng, sau đó bắt đầu tạo mới, bổ sung và thiết lập hàng loạt các mục Lorebook chi tiết nhất.`);
      setMode('document_extraction'); // Automatically set to Document Extraction reader
      if (onClearWikiData) {
        onClearWikiData();
      }
    }
  }, [wikiDataToFeed, onClearWikiData]);

  // Handle file selection and convert to Base64 or Text
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      files.forEach((file: any) => {
        if (file.type === 'text/plain') {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setSelectedDocument({ name: file.name, content: reader.result });
            }
          };
          reader.readAsText(file);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setSelectedImages(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      });

      // Reset input value to allow selecting same file again if needed
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = () => {
    setSelectedDocument(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0 && !selectedDocument) || loading) return;
    
    if (!settings.apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: 'Vui lòng nhập API Key trong phần Cài đặt trước khi trò chuyện.',
        timestamp: Date.now(),
        isError: true
      }]);
      return;
    }

    let initialInput = input;
    if (selectedDocument) {
      initialInput += `\n\n[System: User attached document "${selectedDocument.name}". Total length: ${selectedDocument.content.length} characters. Use action {"type": "read_document", "chunk_index": 0} to read the first chunk of 15000 characters.]`;
    }

    const initialImages = [...selectedImages];
    
    setInput('');
    setSelectedImages([]);
    // Do not clear selectedDocument here, we might need it for multiple turns.
    // Wait, if we keep it, it will be sent again next time user types.
    // We should probably clear it from the UI but keep it in a ref or state for the chat loop.
    // Actually, let's keep it in a ref for the chat loop to access, and clear the UI state.
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await processChat(initialInput, initialImages, selectedDocument);
    setSelectedDocument(null);
  };

  const processChat = async (initialInput: string, initialImages: string[], attachedDoc: {name: string, content: string} | null) => {
    setLoading(true);
    let currentMessages = [...messages];
    let currentLorebookState = { ...lorebook, entries: [...lorebook.entries] };
    
    let nextInput = initialInput;
    let nextImages = initialImages;
    let keepRunning = true;
    let consecutiveEmptyContinues = 0;

    while (keepRunning) {
      keepRunning = false;
      setStreamBuffer('');

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: nextInput,
        images: nextImages,
        timestamp: Date.now(),
        isHidden: nextInput.startsWith('Here is the data you requested:') || nextInput === "Please continue generating the next batch of entries."
      };

      currentMessages = [...currentMessages, userMsg];
      setMessages(currentMessages);

      try {
        const history = currentMessages.filter(m => m.role !== 'system');
        const historyToPass = history.slice(0, -1);

        const response = await worldbuildingChat(
          userMsg.content,
          userMsg.images || [],
          currentLorebookState,
          settings,
          historyToPass,
          (partial) => setStreamBuffer(partial),
          settings.minTokens || 2000,
          mode
        );

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          actions: response.actions
        };

        currentMessages = [...currentMessages, assistantMsg];
        setMessages(currentMessages);
        
        if (response.actions && response.actions.length > 0) {
          onApplyActions(response.actions);
          
          // Update local lorebook state for the next iteration
          for (const action of response.actions) {
            if (action.type === 'create' && action.data) {
              currentLorebookState.entries.push(action.data as any);
            } else if (action.type === 'update' && action.data) {
              const idx = currentLorebookState.entries.findIndex(e => e.comment.toLowerCase() === action.target_comment?.toLowerCase());
              if (idx !== -1) {
                currentLorebookState.entries[idx] = { ...currentLorebookState.entries[idx], ...action.data };
              }
            } else if (action.type === 'delete') {
              currentLorebookState.entries = currentLorebookState.entries.filter(e => e.comment.toLowerCase() !== action.target_comment?.toLowerCase());
            }
          }
        }

        const fetchActions = response.actions?.filter(a => a.type === 'fetch_fandom_data') || [];
        const readDocActions = response.actions?.filter(a => a.type === 'read_document') || [];
        
        if (readDocActions.length > 0) {
          consecutiveEmptyContinues = 0;
          const action = readDocActions[0];
          const chunkIndex = action.chunk_index || 0;
          const chunkSize = 15000;
          const start = chunkIndex * chunkSize;
          const end = start + chunkSize;
          
          if (!attachedDoc || start >= attachedDoc.content.length) {
            nextInput = `[System: END OF DOCUMENT. There are no more chunks to read. Please set status to DONE if you have finished generating entries.]`;
          } else {
            const chunk = attachedDoc.content.substring(start, end);
            nextInput = `[System: Document Chunk ${chunkIndex}]\n${chunk}\n\n[System: End of Chunk ${chunkIndex}. Generate entries for this chunk. If you need the next chunk, output action {"type": "read_document", "chunk_index": ${chunkIndex + 1}}.]`;
          }
          nextImages = [];
          keepRunning = true;
        } else if (fetchActions.length > 0) {
          consecutiveEmptyContinues = 0;
          setStreamBuffer('Đang tải dữ liệu từ Wiki...');
          let combinedData = '';
          const { fetchFandomData } = await import('../services/openai');
          for (const action of fetchActions) {
            if (action.url) {
              const data = await fetchFandomData(action.url);
              combinedData += `\n\n--- Data from ${action.url} ---\n${data}`;
            }
          }
          nextInput = `Here is the data you requested:\n${combinedData}\n\nPlease generate the Lorebook entries based on this data. Remember to use 'CONTINUE' status if you need to generate more batches.`;
          nextImages = [];
          keepRunning = true;
        } else if (response.status === 'CONTINUE') {
          if (!response.actions || response.actions.length === 0) {
            consecutiveEmptyContinues++;
          } else {
            consecutiveEmptyContinues = 0;
          }
          
          if (consecutiveEmptyContinues > 2) {
            console.warn("Too many empty CONTINUE responses. Stopping auto-generation.");
            keepRunning = false;
          } else {
            nextInput = "Please continue generating the next batch of entries.";
            nextImages = [];
            keepRunning = true;
          }
        }

      } catch (error: any) {
        currentMessages = [...currentMessages, {
          id: Date.now().toString(),
          role: 'system',
          content: `Lỗi kết nối Tawa: ${error.message}`,
          timestamp: Date.now(),
          isError: true
        }];
        setMessages(currentMessages);
        break;
      }
    }
    
    setLoading(false);
    setStreamBuffer('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-full max-w-2xl shadow-xl">
      {/* Chat Header */}
      <div className="min-h-[4rem] bg-slate-800/50 backdrop-blur-md border-b border-slate-700 flex flex-wrap items-center justify-between px-6 py-2 shrink-0 z-10 gap-4">
        <div className="flex items-center gap-4">
           {/* Tawa Avatar Header - Larger Size */}
           <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20">
             <img 
               src="https://files.catbox.moe/xa7h6o.jpg" 
               alt="Tawa" 
               className="w-full h-full object-cover"
             />
           </div>
           <div>
             <h3 className="font-bold text-slate-100 text-base">Tawa Worldbuilder</h3>
             <p className="text-xs text-slate-400 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               Connected to Reality
             </p>
           </div>
        </div>

        {/* Protocol Mode Switcher - Compact Carousel */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 p-1 rounded-full shadow-inner shadow-black/40">
           <button
             onClick={handlePrevMode}
             className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-90"
             title="Chế độ trước"
           >
             <ChevronLeft size={16} />
           </button>
           
           <div 
             className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 text-white shadow-md transition-all duration-300 min-w-[150px] select-none ${currentModeInfo.color}`}
             title={currentModeInfo.title}
           >
             {currentModeInfo.icon}
             <span className="tracking-wide">{currentModeInfo.label}</span>
           </div>

           <button
             onClick={handleNextMode}
             className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-90"
             title="Chế độ sau"
           >
             <ChevronRight size={16} />
           </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
        {messages.filter(msg => !msg.isHidden).map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar - Updated to Custom Images and Larger Size (w-12 h-12) */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-1 overflow-hidden shadow-sm border border-slate-700 ${
              msg.role === 'system' ? 'bg-red-900/50' : 'bg-slate-800'
            }`}>
              {msg.role === 'user' ? (
                 <img src="https://files.catbox.moe/6uqe51.jpg" alt="User" className="w-full h-full object-cover" />
              ) : msg.role === 'assistant' ? (
                 <img src="https://files.catbox.moe/xa7h6o.jpg" alt="Tawa" className="w-full h-full object-cover" />
              ) : (
                 <span className="text-xs font-bold text-red-300">SYS</span>
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] space-y-2`}>
              <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-md break-words ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : msg.role === 'system'
                    ? 'bg-red-900/20 border border-red-500/30 text-red-200'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
              }`}>
                {/* Images Display in History */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt="Uploaded content" 
                        className="max-h-48 max-w-full rounded-lg border border-white/20 object-contain"
                      />
                    ))}
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                
                {/* Actions Report Card */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Tawa đã thực hiện {msg.actions.length} thay đổi:
                    </p>
                    {msg.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs bg-slate-900/50 p-2 rounded border border-slate-700/50">
                         {action.type === 'create' && <PlusCircle size={14} className="text-green-400 mt-0.5 shrink-0" />}
                         {action.type === 'update' && <Edit3 size={14} className="text-yellow-400 mt-0.5 shrink-0" />}
                         {action.type === 'delete' && <Trash2 size={14} className="text-red-400 mt-0.5 shrink-0" />}
                         {action.type === 'fetch_fandom_data' && <Layers size={14} className="text-blue-400 mt-0.5 shrink-0" />}
                         {action.type === 'read_document' && <FileText size={14} className="text-amber-400 mt-0.5 shrink-0" />}
                         
                         <div className="min-w-0 flex-1">
                           <span className={`font-mono font-bold ${
                             action.type === 'create' ? 'text-green-300' : 
                             action.type === 'update' ? 'text-yellow-300' : 
                             action.type === 'fetch_fandom_data' ? 'text-blue-300' : 
                             action.type === 'read_document' ? 'text-amber-300' : 'text-red-300'
                           }`}>
                             {action.type.toUpperCase()}
                           </span>
                           <span className="text-slate-400 mx-1">:</span>
                           <span className="text-slate-200 font-medium break-all">
                             {action.type === 'fetch_fandom_data' ? action.url : action.type === 'read_document' ? `Reading chunk ${action.chunk_index}` : (action.target_comment || action.data?.comment || "Unnamed Entry")}
                           </span>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading / Streaming State */}
        {loading && (
          <div className="flex gap-4">
            {/* Loading Avatar - Tawa Image Bouncing */}
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 animate-bounce border border-indigo-500/30">
                 <img src="https://files.catbox.moe/xa7h6o.jpg" alt="Tawa" className="w-full h-full object-cover" />
            </div>
            <div className="max-w-[85%] bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl rounded-tl-sm px-5 py-3 text-sm shadow-md">
               {streamBuffer ? (
                 <div className="whitespace-pre-wrap font-mono text-xs text-purple-200">{streamBuffer}</div>
               ) : (
                 <div className="flex items-center gap-2">
                   <Loader2 size={16} className="animate-spin text-purple-400" />
                   <span>Tawa đang dệt lại hiện thực...</span>
                 </div>
               )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="!mt-0" />
      </div>

      {/* Refined Modern Input Area */}
      <div className="p-4 bg-transparent pb-6 border-t border-slate-700/30">
        <div className="max-w-3xl mx-auto space-y-2">
          
          {/* 1. Normal Image Previews (When NOT running pipeline) */}
          {!pipelineRunning && (selectedImages.length > 0 || selectedDocument) && (
            <div className="flex gap-3 mb-1 overflow-x-auto pb-2 custom-scrollbar px-2 pt-2">
              {selectedDocument && (
                <div className="relative shrink-0 group animate-in fade-in zoom-in duration-200">
                  <div className="w-auto h-16 px-4 rounded-xl border border-amber-600/50 overflow-hidden shadow-lg bg-slate-800 flex items-center gap-2">
                     <FileText size={24} className="text-amber-400" />
                     <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{selectedDocument.name}</span>
                       <span className="text-[10px] text-slate-400">{(selectedDocument.content.length / 1024).toFixed(1)} KB</span>
                     </div>
                  </div>
                  <button 
                    onClick={removeDocument}
                    className="absolute -top-2 -right-2 z-50 bg-slate-800 text-red-400 border border-slate-600 rounded-full p-1 shadow-md hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              )}
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative shrink-0 group animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 rounded-xl border border-slate-600/50 overflow-hidden shadow-lg bg-slate-800">
                     <img src={img} alt="Preview" className="w-full h-full object-cover opacity-90" />
                  </div>
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 z-50 bg-slate-800 text-red-400 border border-slate-600 rounded-full p-1 shadow-md hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 2. Pipeline Auto-run Banner Suggestion */}
          {selectedDocument && !pipelineRunning && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/45 to-slate-900 p-4 rounded-2xl border border-indigo-500/20 shadow-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">Bản Đồ Tri Thức Wiki Đang Chờ</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tài liệu Wiki hoạt động: <span className="font-mono font-semibold text-indigo-300">"{selectedDocument.name}"</span> ({(selectedDocument.content.length / 1024).toFixed(1)} KB)</p>
                </div>
              </div>
              
              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                Khi kích hoạt, Tawa sẽ bắt đầu chạy chuỗi nhiệm vụ mổ xẻ liên thông <span className="text-indigo-400 font-semibold font-mono">{(settings.steps && settings.steps.length > 0 ? settings.steps : DEFAULT_WORLDBUILDING_STEPS).filter(s => s.enabled).length} bước</span> theo chỉ thị riêng của người dùng cho đến khi trích xuất sạch 100% tài liệu mà không bị trùng lặp.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                <Button 
                  onClick={handleStartPipeline}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 border-none shadow-md shadow-indigo-600/20 transition-all font-sans"
                  icon={<Dna size={14} className="animate-pulse" />}
                >
                  Bắt đầu Quy trình Hướng dẫn Tự động
                </Button>
              </div>
            </div>
          )}

          {/* 3. Pipeline Real-time Progress Control Console */}
          {pipelineRunning && (
            <div className="bg-slate-950/80 rounded-2xl border border-indigo-500/30 shadow-2xl overflow-hidden animate-in zoom-in duration-305">
              <div className="bg-indigo-950/45 p-3 flex items-center justify-between border-b border-indigo-500/20 px-4">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-widest animate-pulse">
                    TIẾN TRÌNH: BƯỚC {pipelineCurrentStepIndex + 1}/{enabledStepCount}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {/* Bộ đếm thời gian đã chạy */}
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/25 px-2 py-1 rounded-lg flex items-center gap-1 tabular-nums">
                    <Clock size={11} /> {fmtElapsed(pipelineElapsed)}
                  </span>
                  <button
                    onClick={handleStopPipeline}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-red-950 border border-red-500/20 hover:bg-red-900/50 text-red-300 transition-all font-semibold"
                  >
                    TẠM DỪNG QUY TRÌNH
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {(() => {
                  // % tổng = (số bước xong + tỉ lệ mảnh của bước hiện tại) / tổng bước
                  const chunkFrac = chunkStats.total > 0 ? chunkStats.done / chunkStats.total : 0;
                  const overall = enabledStepCount > 0
                    ? Math.min(100, Math.round(((pipelineCurrentStepIndex + chunkFrac) / enabledStepCount) * 100))
                    : 0;
                  const chunkPct = chunkStats.total > 0 ? Math.round((chunkStats.done / chunkStats.total) * 100) : 0;
                  return (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-end">
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      Nhiệm vụ: {enabledStepList[pipelineCurrentStepIndex]?.name}
                    </h4>
                    <span className="text-[11px] font-mono font-bold text-indigo-300 tabular-nums">
                      {overall}%
                    </span>
                  </div>

                  {/* Thanh tiến trình TỔNG (mượt theo mảnh, không nhảy cục) */}
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                      style={{ width: `${overall}%` }}
                    />
                  </div>

                  {/* Badge LIVE: model đang gọi + số luồng song song đang chạy + mảnh done/total */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-violet-200 bg-violet-950/50 border border-violet-500/30 px-2 py-1 rounded-md flex items-center gap-1">
                      <Cpu size={11} className="text-violet-400" /> {chunkStats.model || settings.model}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-amber-200 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded-md flex items-center gap-1">
                      <Activity size={11} className={chunkStats.running > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
                      {chunkStats.running} luồng song song
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-sky-200 bg-sky-950/40 border border-sky-500/30 px-2 py-1 rounded-md flex items-center gap-1">
                      <Layers size={11} className="text-sky-400" /> {chunkStats.done}/{chunkStats.total} mảnh
                    </span>
                  </div>

                  {/* Thanh tiến trình MẢNH của riêng bước hiện tại */}
                  {chunkStats.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8.5px] font-mono uppercase tracking-wider text-slate-500">
                        <span>Mổ xẻ mảnh bước {pipelineCurrentStepIndex + 1}</span>
                        <span className="tabular-nums">{chunkPct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                          style={{ width: `${chunkPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                  );
                })()}

                {streamBuffer && (
                  <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/10 max-h-[140px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-start gap-2">
                      <Bot size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-xs font-mono text-indigo-200 leading-relaxed whitespace-pre-wrap">
                        {streamBuffer}
                      </p>
                    </div>
                  </div>
                )}

                {pipelineWaitingConfirmation && (
                  <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in zoom-in duration-200 shadow-lg">
                    <p className="text-xs text-indigo-200 font-medium font-sans">
                      {pipelineError ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1.5">
                          ⚠️ Gặp sự cố: {pipelineError}. Hãy bấm "Tái chế / Sửa lỗi" để phục hồi trạng thái và tạo lại mảnh bị lỗi ngay lập tức!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                          ✨ Mảnh bối cảnh của: "{(settings.steps && settings.steps.length > 0 ? settings.steps : DEFAULT_WORLDBUILDING_STEPS).filter(s => s.enabled)[pipelineCurrentStepIndex]?.name || 'Hiện tại'}" đã dệt xong. Xin mời baka duyệt kết quả:
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2.5 pt-1">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg border-none active:scale-95 transition-all"
                        onClick={() => {
                          if (pipelineApprovalResolverRef.current) {
                            pipelineApprovalResolverRef.current('approve');
                          }
                        }}
                      >
                        {pipelineError ? "Bỏ qua & Đi tiếp" : "✓ Xác nhận duyệt & Sang bước sau"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/35 font-bold text-xs px-4 py-1.5 rounded-lg active:scale-95 transition-all"
                        onClick={() => {
                          if (pipelineApprovalResolverRef.current) {
                            pipelineApprovalResolverRef.current('retry');
                          }
                        }}
                      >
                        ⚡ Tái chế / Sửa lỗi (Dệt lại)
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-black/40 p-3 rounded-lg border border-slate-800 max-h-[120px] overflow-y-auto font-mono text-[9px] leading-relaxed space-y-1 scrollbar-hide">
                  {pipelineLogs.map((log, lIdx) => (
                    <div key={lIdx} className="text-slate-400 flex items-start gap-1.5">
                      <span className="text-indigo-500">▶</span>
                      <span className="break-words">{log}</span>
                    </div>
                  ))}
                  {pipelineSubLoading && (
                    <div className="text-indigo-400 animate-pulse flex items-center gap-1.5 mt-1">
                      <span>●</span>
                      <span className="font-semibold text-[8px] uppercase tracking-wider">Tawa đang đàm thoại cấu trúc tri thức...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Main Input Capsule - Display ONLY when pipeline is not running */}
          {!pipelineRunning && (
            <div className="relative flex items-end gap-2 bg-slate-950/30 backdrop-blur-xl p-1.5 rounded-[26px] border border-white/10 shadow-2xl ring-1 ring-white/5 focus-within:ring-indigo-500/30 transition-all duration-300">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect} 
                accept="image/*,text/plain" 
                multiple 
              />
              
              <button 
                className="shrink-0 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full transition-all duration-200 group relative mb-0.5 ml-0.5"
                onClick={() => fileInputRef.current?.click()}
                title="Tải ảnh hoặc file .txt lên"
              >
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                <ImageIcon size={20} className="relative z-10" />
              </button>

              <textarea
                ref={textareaRef}
                placeholder={`Nhập ý tưởng... (${mode === 'genesis' ? 'Chế độ Tạo Mới' : mode === 'evolution' ? 'Chế độ Chỉnh Sửa & Wiki' : mode === 'document_extraction' ? 'Tải file .txt lên để đọc' : mode === 'rework' ? 'Tối ưu & Cải thiện Prompt' : 'Chế độ Thảo Luận'})`}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-400/70 resize-none py-3 px-1 max-h-[160px] min-h-[44px] text-sm leading-relaxed scrollbar-hide"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                rows={1}
              />

              <button 
                className={`shrink-0 h-[42px] px-5 rounded-3xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all duration-300 transform active:scale-95 mb-0.5 mr-0.5 ${
                  (!input.trim() && selectedImages.length === 0 && !selectedDocument) || loading
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/30'
                }`}
                onClick={handleSend}
                disabled={(!input.trim() && selectedImages.length === 0 && !selectedDocument) || loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} strokeWidth={2.5} className={(!input.trim() && selectedImages.length === 0 && !selectedDocument) ? "" : "ml-0.5"} />
                )}
              </button>
            </div>
          )}

          {!pipelineRunning && (
            <div className="flex justify-center items-center gap-3 text-[10px] text-slate-500/80 font-medium tracking-wide">
              <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Enter để gửi</span>
              <span>•</span>
              <span className="flex items-center gap-1"><ImageIcon size={10} /> Shift+Enter xuống dòng</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
