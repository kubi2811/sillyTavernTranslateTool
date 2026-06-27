import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { OpenAISettings, AIModel, WorldbuildingStep, AIPromptBlock } from '../types';
import { fetchModels, worldbuildingChat, testAIPrompts } from '../services/openai';
import { DEFAULT_MASTER_INSTRUCTION } from '../constants/masterInstruction';
import { DEFAULT_STEPS, DEFAULT_PROMPTS } from '../constants/pipelineDefaults';
import { RefreshCw, Save, Server, Sliders, Flame, Ruler, Search, Plus, Trash2, List, Settings, HelpCircle, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OpenAISettings;
  onSave: (settings: OpenAISettings) => void;
  onAnalyzePipeline?: (steps: WorldbuildingStep[]) => void;
  getDefaults?: () => OpenAISettings;       // trả về settings mặc định (cho nút Khôi phục)
  storageDir?: string | null;               // đường dẫn folder lưu dữ liệu (null = lưu trên trình duyệt)
}

// 5 bước + 5 prompt gốc lấy từ nguồn chung (constants/pipelineDefaults).
const DEFAULT_WORLDBUILDING_STEPS = DEFAULT_STEPS;
const DEFAULT_AI_PROMPTS = DEFAULT_PROMPTS;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  getDefaults,
  storageDir,
  onAnalyzePipeline,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'guide' | 'steps'>('general');
  const [formData, setFormData] = useState<OpenAISettings>(() => {
    const s = { ...settings };
    // 5 bước vẫn chạy NGẦM (đảm bảo Zero Omission) dù không còn UI sửa riêng từng bước.
    if (!s.steps || s.steps.length === 0) {
      s.steps = JSON.parse(JSON.stringify(DEFAULT_WORLDBUILDING_STEPS));
    }
    if (!s.aiPrompts || s.aiPrompts.length === 0) {
      s.aiPrompts = JSON.parse(JSON.stringify(DEFAULT_AI_PROMPTS));
    }
    // "Hướng dẫn tổng" — gộp 2 tab cũ thành 1 text bự, mặc định = Cấu hình Worldbook 2.txt.
    if (!s.masterInstruction || !s.masterInstruction.trim()) {
      s.masterInstruction = DEFAULT_MASTER_INSTRUCTION;
    }
    return s;
  });
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [isInitializingAI, setIsInitializingAI] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAnalyzePipelineDeeply = async () => {
    setIsAnalyzing(true);
    setAnalysisStatus('Tawa đang đọc & suy ngẫm các bước bối cảnh...');
    
    const master = (formData.masterInstruction || '').trim();
    if (!master) {
      setAnalysisStatus('Thất bại: "Hướng dẫn tổng" đang trống!');
      setIsAnalyzing(false);
      return;
    }

    const prompt = `[HỆ THỐNG - CHỈ LỆNH THẤU HIỂU ĐỘC LẬP]
Chủ nhân vừa cập nhật "HƯỚNG DẪN TỔNG" — bộ chỉ dẫn chung sẽ áp dụng cho mọi bước sinh thế giới.
Nhiệm vụ của con:
1. Đọc & phân giải toàn bộ hướng dẫn dưới đây để hấp thụ 100% nguyên tắc hoạt động.
2. Viết một bản TÓM TẮT LÀM RÕ LỘ TRÌNH VÀ TÂM LÝ HOẠT ĐỘNG của con dành cho chủ nhân (khoảng 3-5 câu). Dùng giọng điệu hiếu kính, baka nhí nhảnh dễ thương ("baka~ 🌸").
3. Chỉ trả về trường "message" chứa bản tóm tắt thấu hiểu sâu sắc này để đưa vào bộ nhớ cốt lõi. "actions" là [].

HƯỚNG DẪN TỔNG:
${master}`;

    try {
      const response = await worldbuildingChat(
        prompt,
        [],
        { name: '', description: '', entries: [] },
        formData,
        []
      );
      
      const memoryResult = response.message;
      setFormData(prev => ({
        ...prev,
        aiPipelineMemory: memoryResult
      }));
      setAnalysisStatus('Thành công! Tawa đã nạp bối cảnh vào nơ-ron hoạt động.');
    } catch (err: any) {
      console.error(err);
      setAnalysisStatus(`Lỗi: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchModels = async () => {
    if (!formData.baseUrl || !formData.apiKey) {
      setError("Vui lòng nhập Proxy URL và API Key");
      return;
    }
    setLoadingModels(true);
    setError(null);
    try {
      const fetchedModels = await fetchModels(formData.baseUrl, formData.apiKey);
      setModels(fetchedModels);
      if (fetchedModels.length > 0 && !fetchedModels.find(m => m.id === formData.model)) {
         setFormData(prev => ({ ...prev, model: fetchedModels[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách model");
    } finally {
      setLoadingModels(false);
    }
  };

  const handleAddStep = () => {
    const newStep: WorldbuildingStep = {
      id: `step_${Date.now()}`,
      name: `Bước mới ${formData.steps ? formData.steps.length + 1 : 1}`,
      prompt: '',
      enabled: true
    };
    setFormData(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));
  };

  const handleRemoveStep = (id: string) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).filter(step => step.id !== id)
    }));
  };

  const handleUpdateStep = (id: string, updates: Partial<WorldbuildingStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).map(step => step.id === id ? { ...step, ...updates } : step)
    }));
  };

  const handleAddPrompt = () => {
    const newPrompt: AIPromptBlock = {
      id: `prompt_${Date.now()}`,
      title: `PROMPT ${formData.aiPrompts ? formData.aiPrompts.length + 1 : 1}: TIÊU ĐỀ MỚI`,
      content: ''
    };
    setFormData(prev => ({
      ...prev,
      aiPrompts: [...(prev.aiPrompts || []), newPrompt]
    }));
  };

  const handleRemovePrompt = (id: string) => {
    setFormData(prev => ({
      ...prev,
      aiPrompts: (prev.aiPrompts || []).filter(p => p.id !== id)
    }));
  };

  const handleUpdatePrompt = (id: string, updates: Partial<AIPromptBlock>) => {
    setFormData(prev => ({
      ...prev,
      aiPrompts: (prev.aiPrompts || []).map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const handleSaveAndInitializeAI = async () => {
    setIsInitializingAI(true);
    setError(null);
    try {
      // 1. Save data first (calls onSave)
      onSave(formData);
      
      // 2. Perform hidden test API call if API key exists
      if (formData.apiKey) {
        setToast({ message: "Đang đồng bộ và kiểm tra kết nối với AI...", type: 'info' });
        const success = await testAIPrompts(formData, formData.aiPrompts || []);
        if (success) {
          setToast({ message: "Đồng bộ hóa thành công! AI đã nhận diện toàn bộ các prompt.", type: 'success' });
        } else {
          setToast({ message: "Lưu thành công. Kết nối API OK nhưng AI trả về nội dung trống — kiểm tra lại model/key.", type: 'info' });
        }
      } else {
        setToast({ message: "Lưu prompt thành công (Chưa cấu hình API Key để đồng bộ AI).", type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Đồng bộ thất bại: ${err.message || "Kiểm tra kết nối/API Key"}`, type: 'error' });
    } finally {
      setIsInitializingAI(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  // Khôi phục TOÀN BỘ cài đặt về mặc định (giữ lại API key + Proxy URL để khỏi nhập lại).
  const handleResetDefaults = () => {
    if (!getDefaults) return;
    if (!window.confirm('Khôi phục TOÀN BỘ cài đặt về mặc định?\n(API Key và Proxy URL hiện tại sẽ được giữ lại)')) return;
    const defs = getDefaults();
    setFormData({ ...defs, apiKey: formData.apiKey, baseUrl: formData.baseUrl });
    setToast({ message: 'Đã khôi phục cài đặt mặc định. Bấm "Lưu cấu hình" để áp dụng.', type: 'success' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cấu hình AI Proxy & Hướng dẫn Quy trình" size="lg">
      <div className="space-y-6">
        
        {/* Tab Headers */}
        <div className="flex border-b border-slate-700/80">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all ${
              activeTab === 'general'
                ? 'border-indigo-500 text-slate-100 bg-slate-800/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings size={14} /> Thống số kết nối & AI
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all relative ${
              activeTab === 'guide'
                ? 'border-indigo-500 text-slate-100 bg-slate-800/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} /> Hướng dẫn tổng
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all relative ${
              activeTab === 'steps'
                ? 'border-indigo-500 text-slate-100 bg-slate-800/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <List size={14} /> Các bước AI
            {formData.steps && formData.steps.filter(s => s.enabled).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-600 text-indigo-100 border border-indigo-400/35">
                {formData.steps.filter(s => s.enabled).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Connection Settings */}
            <div className="space-y-4 pb-4 border-b border-slate-700/50">
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} /> Kết nối
              </h4>
              <Input 
                label="API Proxy URL (Base URL)" 
                placeholder="Ví dụ: https://api.openai.com/v1" 
                value={formData.baseUrl}
                onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
              />
              
              <Input 
                label="API Key" 
                type="password"
                placeholder="sk-..." 
                value={formData.apiKey}
                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
              />

              <div className="flex items-end gap-2">
                <div className="flex-1">
                   <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                   <div className="relative">
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-mono"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                      >
                        {models.length === 0 && <option value={formData.model}>{formData.model || "Chưa tải model"}</option>}
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.id}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none">
                        <Server size={14} className="text-slate-500"/>
                      </div>
                   </div>
                </div>
                <Button 
                   variant="secondary" 
                   onClick={handleFetchModels} 
                   isLoading={loadingModels}
                   icon={<RefreshCw size={16}/>}
                   title="Tải danh sách model"
                >
                  Load
                </Button>
              </div>

              {/* ── Đa luồng & Model phụ (Chính = Pro, Phụ = Flash) ── */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-indigo-500/20 space-y-3">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-400" /> Đa luồng & Model phụ (RPM)
                </span>

                {/* ── CHẾ ĐỘ MIX (song công 2 model) ── */}
                <div className="bg-gradient-to-r from-indigo-950/50 to-purple-950/40 p-3 rounded-lg border border-indigo-500/30 space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox" className="peer sr-only"
                        checked={formData.mixMode !== false}
                        onChange={(e) => setFormData({ ...formData, mixMode: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
                    </div>
                    <span className="text-sm font-bold text-indigo-100 flex items-center gap-1.5">
                      ⚡ Chế độ Mix <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-600/30 border border-emerald-500/40 text-emerald-200">~3× NHANH HƠN</span>
                    </span>
                  </label>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed pl-[3.7rem]">
                    Khi sinh thế giới, chia việc cho <b>cả 2 model (Pro + Flash) chạy đồng thời</b> theo tỉ lệ RPM → cộng dồn tốc độ. Tắt đi nếu muốn chỉ dùng Model Chính (chất lượng đồng nhất hơn nhưng chậm hơn).
                  </p>

                  {/* ── SUPER MIX (gộp 5 nhóm vào 1 lượt) ── */}
                  <div className="mt-2 pt-2 border-t border-indigo-500/15">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox" className="peer sr-only"
                          checked={formData.superMix === true}
                          onChange={(e) => setFormData({ ...formData, superMix: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-rose-500"></div>
                      </div>
                      <span className="text-sm font-bold text-orange-100 flex items-center gap-1.5">
                        🚀 Super Mix <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-600/30 border border-orange-500/40 text-orange-200">~5×+ NHANH HƠN</span>
                      </span>
                    </label>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed pl-[3.7rem] mt-1">
                      Thay vì quét tài liệu <b>5 lần</b> (mỗi nhóm 1 lượt), Super Mix chỉ đọc <b>1 lần</b> rồi bóc tách <b>đồng thời cả 5 nhóm</b> (thế giới quan, phe phái, địa danh, nhân vật…) trong cùng một lượt gọi → giảm ~5× số request. Kết hợp với Chế độ Mix càng nhanh.
                      <br/><span className="text-orange-300/80">⚠️ Đánh đổi: AI làm nhiều việc/lượt nên phân loại có thể thô hơn so với quét tách từng nhóm. Bật khi cần tốc độ tối đa.</span>
                    </p>
                  </div>

                  {/* ── BƯỚC 6: GỘP TRÙNG NGỮ NGHĨA ── */}
                  <div className="mt-2 pt-2 border-t border-indigo-500/15">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox" className="peer sr-only"
                          checked={formData.semanticDedup !== false}
                          onChange={(e) => setFormData({ ...formData, semanticDedup: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500"></div>
                      </div>
                      <span className="text-sm font-bold text-emerald-100 flex items-center gap-1.5">
                        🧹 Bước 6: Gộp trùng ngữ nghĩa
                      </span>
                    </label>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed pl-[3.7rem] mt-1">
                      Sau khi sinh xong, dùng <b>model phụ (Flash)</b> rà các mục <b>cùng 1 thực thể nhưng khác tên</b> (vd "Keiko's Mother" = "Mrs. Yukimura") rồi gộp (giữ bản dài nhất, gộp từ khóa). Bắt loại trùng mà so-chữ không thấy. Cần bật Model Phụ.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    RPM Model Chính (Pro) — việc nặng: sinh entry chi tiết
                  </label>
                  <input
                    type="number" min={1} max={240}
                    value={formData.primaryRpm ?? 5}
                    onChange={(e) => setFormData({ ...formData, primaryRpm: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox" className="peer sr-only"
                      checked={formData.enableSecondaryModel || false}
                      onChange={(e) => setFormData({ ...formData, enableSecondaryModel: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="text-sm text-slate-200">Bật Model Phụ (Flash) — việc ngắn: phân loại tiêu đề / dịch</span>
                </label>

                {formData.enableSecondaryModel && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Model Phụ (Flash)</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-mono"
                        value={formData.secondaryModel || ''}
                        onChange={(e) => setFormData({ ...formData, secondaryModel: e.target.value })}
                      >
                        {models.length === 0 && <option value={formData.secondaryModel || ''}>{formData.secondaryModel || 'Chưa tải model'}</option>}
                        {models.map(m => (<option key={m.id} value={m.id}>{m.id}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">RPM Model Phụ (Flash)</label>
                      <input
                        type="number" min={1} max={240}
                        value={formData.secondaryRpm ?? 10}
                        onChange={(e) => setFormData({ ...formData, secondaryRpm: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </>
                )}
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Crawl wiki là HTTP (KHÔNG tốn RPM). RPM chỉ áp cho lệnh gọi AI. Model chính lo sinh entry; model phụ phân loại/dịch nhanh &amp; rẻ. Bấm <b>Load</b> để tải danh sách model cho cả 2 ô.
                </p>
              </div>
            </div>

            {/* Generation Parameters */}
            <div className="space-y-4 pb-4 border-b border-slate-700/50">
               <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={14} /> Tham số tạo (Generation)
               </h4>
               
               {/* Target Tokens Enforcement */}
               <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Ruler size={14} className="text-green-400" />
                      Target Tokens (Độ dài tối thiểu ép buộc)
                    </label>
                    <span className="text-xs font-mono text-green-300 bg-green-900/30 px-2 py-1 rounded border border-green-500/30">
                      {formData.minTokens || 2000} tokens
                    </span>
                 </div>
                 <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="500" 
                      max="10000" 
                      step="100" 
                      value={formData.minTokens || 2000}
                      onChange={(e) => setFormData({...formData, minTokens: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <input 
                      type="number" 
                      min="500"
                      value={formData.minTokens || 2000}
                      onChange={(e) => setFormData({...formData, minTokens: parseInt(e.target.value)})}
                      className="w-20 bg-slate-950 border border-slate-700 text-slate-100 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-green-500 outline-none"
                    />
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">
                   Áp dụng cho cả Chat (Tawa Worldbuilder). AI sẽ cố gắng viết dài ít nhất chừng này.
                 </p>
               </div>

               {/* Giao thức ép buộc hoàn thiện tối đa (Zero Omission) */}
               <div className="p-4 rounded-lg bg-purple-900/10 border border-purple-500/30">
                 <label className="flex items-start gap-4 cursor-pointer animate-in fade-in duration-200">
                     <div className="relative flex items-center mt-1">
                        <input 
                           type="checkbox" 
                           className="peer sr-only"
                           id="enableCompletenessProtocol"
                           checked={formData.enableCompletenessProtocol || false}
                           onChange={(e) => setFormData({...formData, enableCompletenessProtocol: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                     </div>
                     <div>
                       <span className="block text-sm font-bold text-purple-200 flex items-center gap-2">
                         <Sparkles size={14} className="text-purple-400" />
                         Giao thức ép buộc hoàn thiện tối đa (Zero Omission)
                       </span>
                       <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                         Ép AI trích xuất 100% thực thể (Thế giới, nhân vật, địa điểm, sự kiện...) không bỏ sót bất kỳ chi tiết canon nào. AI sẽ tự động trả về trạng thái CONTINUE cho đến khi quét sạch bối cảnh.
                       </p>
                     </div>
                 </label>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Context Size (tokens)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.contextSize}
                      onChange={(e) => setFormData({...formData, contextSize: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Max Response Length (tokens)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value) || 0})}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Temperature ({formData.temperature})</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" min="0" max="2" step="0.05"
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                      />
                      <input 
                        type="number" step="0.05"
                        className="w-16 bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-1 py-1 text-xs text-center"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Top P ({formData.topP})</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" min="0" max="1" step="0.01"
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        value={formData.topP}
                        onChange={(e) => setFormData({...formData, topP: parseFloat(e.target.value)})}
                      />
                      <input 
                        type="number" step="0.01" max="1"
                        className="w-16 bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-1 py-1 text-xs text-center"
                        value={formData.topP}
                        onChange={(e) => setFormData({...formData, topP: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Top K</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.topK}
                      onChange={(e) => setFormData({...formData, topK: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/30 rounded transition-colors w-full border border-slate-700/50 bg-slate-800/20">
                        <input 
                          type="checkbox" 
                          className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                          checked={formData.streaming}
                          onChange={(e) => setFormData({...formData, streaming: e.target.checked})}
                        />
                        <div>
                          <span className="block text-sm font-medium text-slate-200">Streaming</span>
                          <span className="block text-xs text-slate-500">Hiển thị phản hồi từng chút một (Stream)</span>
                        </div>
                    </label>
                  </div>
               </div>
            </div>

            {/* Content Settings */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wider flex items-center gap-2">
                  <Flame size={14} /> Chế độ nội dung
                </h4>
                
                <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/30 mb-4">
                  <label className="flex items-start gap-4 cursor-pointer">
                      <div className="relative flex items-center mt-1">
                         <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={formData.enableSearch}
                            onChange={(e) => setFormData({...formData, enableSearch: e.target.checked})}
                         />
                         <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-blue-200 flex items-center gap-2"><Search size={14} /> Cho phép Google Search</span>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Khi bật, AI sẽ được cấp quyền sử dụng Google Search để tìm kiếm thông tin mới nhất trên Internet.
                        </p>
                      </div>
                  </label>
                </div>

                <div className="p-4 rounded-lg bg-red-900/10 border border-red-500/30">
                  <label className="flex items-start gap-4 cursor-pointer">
                      <div className="relative flex items-center mt-1">
                         <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={formData.nsfw}
                            onChange={(e) => setFormData({...formData, nsfw: e.target.checked})}
                         />
                         <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-red-200">NSFW Mode (Tawa Uncensored)</span>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Khi bật, Tawa sẽ được phép tạo mọi nội dung người lớn (R18, guro, bondage...) mà không có giới hạn hay bộ lọc đạo đức nào. 
                          <br/><span className="text-red-400 font-semibold">Cảnh báo: Nội dung tạo ra có thể không phù hợp với mọi lứa tuổi.</span>
                        </p>
                      </div>
                  </label>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <Sparkles size={13} strokeWidth={2.5} />
                Hướng dẫn tổng (1 text bự cho mọi bước)
              </span>
              <p>
                Đây là bộ chỉ dẫn CHUNG mà Tawa luôn áp dụng khi mổ xẻ tài liệu Wiki. 5 bước quét tuần tự (chống bỏ sót 100%) vẫn chạy ngầm, tất cả đều bám theo hướng dẫn này.
              </p>
              <p className="text-[11px] text-slate-400 font-sans italic">
                Mặc định là nội dung "Cấu hình Worldbook". Con cứ sửa thoải mái — nội dung ở đây sẽ được nhét vào đầu mỗi lượt sinh entry.
              </p>
            </div>

            {/* Nút nạp hướng dẫn cho AI đọc hiểu */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-950/40 p-4 rounded-xl border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-md">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-sans">
                  <Sparkles size={13} className="text-indigo-400" />
                  Gửi "Hướng dẫn tổng" cho AI đọc hiểu
                </span>
                <span className="text-[10.5px] text-slate-400 block leading-relaxed font-sans">
                  Tawa sẽ đọc & tóm tắt lộ trình, chuẩn bị tâm lý để ghi nhớ, tránh lặp lại bối cảnh cũ!
                </span>
              </div>
              <Button
                variant="primary"
                onClick={handleAnalyzePipelineDeeply}
                disabled={isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg active:scale-95 transition-all text-center self-stretch sm:self-auto shadow-md border-none disabled:opacity-50 shrink-0"
                icon={<Sparkles size={14} className={isAnalyzing ? "animate-spin" : ""} />}
              >
                {isAnalyzing ? "Đang phân tích..." : "Gửi cho AI đọc hiểu"}
              </Button>
            </div>

            {analysisStatus && (
              <div className="text-[11px] font-mono p-2.5 rounded-lg bg-indigo-950/25 border border-indigo-500/20 text-indigo-300">
                ⚡ {analysisStatus}
              </div>
            )}

            {formData.aiPipelineMemory && (
              <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider font-sans flex items-center gap-1">
                    🧠 Trí não Tawa đã thấu hiểu & ghi nhớ sâu:
                  </span>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, aiPipelineMemory: undefined }))}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors py-0.5 px-1.5 bg-red-950/20 border border-red-500/20 rounded font-sans"
                  >
                    Xóa bộ nhớ
                  </button>
                </div>
                <textarea
                  className="w-full text-[11px] bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded p-2 text-slate-300 font-sans leading-relaxed min-h-[70px] focus:outline-none"
                  value={formData.aiPipelineMemory}
                  onChange={(e) => setFormData(prev => ({ ...prev, aiPipelineMemory: e.target.value }))}
                  placeholder="Bản phân tích và thấu hiểu của AI về quy trình..."
                />
              </div>
            )}

            {/* Master instruction (text bự) */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <List size={13} /> Nội dung hướng dẫn tổng
                </label>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, masterInstruction: DEFAULT_MASTER_INSTRUCTION }))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 px-1.5 bg-indigo-950/20 border border-indigo-500/20 rounded font-sans flex items-center gap-1"
                  title="Nạp bộ rule mặc định từ Cấu hình Worldbook 2.txt"
                >
                  <RefreshCw size={11} /> Nạp rule Worldbook 2
                </button>
              </div>
              <textarea
                className="w-full bg-slate-900/85 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2.5 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[360px] custom-scrollbar"
                value={formData.masterInstruction || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, masterInstruction: e.target.value }))}
                placeholder="Dán toàn bộ hướng dẫn tổng (quy tắc cấu hình worldbook, cách trích xuất, định dạng entry...) vào đây..."
              />
              <p className="text-[10px] text-slate-500 font-sans">
                {(formData.masterInstruction || '').length.toLocaleString()} ký tự
              </p>
            </div>

            {/* Action button */}
            <div className="pt-2 flex justify-end items-center gap-3">
              <Button
                variant="primary"
                onClick={handleSaveAndInitializeAI}
                isLoading={isInitializingAI}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg active:scale-95 transition-all shadow-md border-none flex items-center gap-1.5"
                icon={<Sparkles size={14} className={isInitializingAI ? "animate-spin" : ""} />}
              >
                Save & Initialize AI
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <List size={13} strokeWidth={2.5} /> 5 bước sinh thế giới (chạy tuần tự)
              </span>
              <p>
                Pipeline chạy <b>lần lượt</b> các bước đang bật: ①Thế Giới Quan+META → ②Hệ Thống → ③Nhân Vật → ④Khu Vực → ⑤Dòng Thời Gian. Mỗi bước quét TOÀN BỘ tài liệu cho đúng nhóm của nó (chống bỏ sót).
              </p>
              <p className="text-[11px] text-slate-400 italic">Tắt bước nào thì bỏ tick "Kích hoạt". Có thể sửa prompt từng bước hoặc thêm bước mới.</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {(formData.steps || []).map((step, idx) => (
                <div key={step.id} className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 hover:border-slate-700/80 transition-colors space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-md shrink-0">#{idx + 1}</span>
                      <input
                        type="text"
                        className="bg-transparent border-b border-dashed border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-bold text-slate-100 font-mono w-full px-1 py-0.5"
                        value={step.name}
                        onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                        placeholder="Tên bước..."
                      />
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                          checked={step.enabled}
                          onChange={(e) => handleUpdateStep(step.id, { enabled: e.target.checked })}
                        />
                        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Kích hoạt</span>
                      </label>
                      <button onClick={() => handleRemoveStep(step.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Xóa bước này">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[90px]"
                    rows={4}
                    value={step.prompt}
                    onChange={(e) => handleUpdateStep(step.id, { prompt: e.target.value })}
                    placeholder="Chỉ dẫn AI trích xuất gì + định dạng entry ra sao..."
                  />
                </div>
              ))}
              {(formData.steps || []).length === 0 && (
                <div className="text-center py-8 rounded-xl bg-slate-950/20 border border-slate-800/50">
                  <List size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Chưa có bước nào. Bấm "Thêm bước mới".</p>
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-between items-center gap-3">
              <Button variant="secondary" onClick={handleAddStep} icon={<Plus size={14} />} className="text-xs font-semibold py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-none rounded-lg">
                Thêm bước mới
              </Button>
              <button
                onClick={() => { if (window.confirm('Khôi phục 5 bước gốc? (xóa tùy biến bước hiện tại)')) setFormData(prev => ({ ...prev, steps: JSON.parse(JSON.stringify(DEFAULT_WORLDBUILDING_STEPS)) })); }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 py-1 px-2 bg-indigo-950/20 border border-indigo-500/20 rounded flex items-center gap-1"
              >
                <RefreshCw size={11} /> Khôi phục 5 bước gốc
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-200 text-sm rounded-md">
            {error}
          </div>
        )}

        {/* Dòng đường dẫn lưu dữ liệu */}
        <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap">
          <Server size={11} className="text-slate-600 shrink-0" />
          {storageDir ? (
            <span>Dữ liệu lưu ra file tại: <span className="text-emerald-400 break-all">{storageDir}</span> <span className="text-slate-600">(xóa folder này = reset sạch)</span></span>
          ) : (
            <span>Đang lưu trong <b className="text-slate-400">localStorage trình duyệt</b>. Chạy bản local (<code className="text-indigo-400">npm run dev</code>) để lưu ra file đĩa, đổi vị trí qua <code className="text-indigo-400">TAWA_DATA_DIR</code> trong .env.</span>
          )}
        </div>

        {/* Action controls footer */}
        <div className="flex justify-between items-center gap-3 mt-3 pt-4 border-t border-slate-700/60">
          <Button
            variant="ghost"
            onClick={handleResetDefaults}
            className="text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 text-xs"
            icon={<RefreshCw size={14} />}
          >
            Khôi phục mặc định toàn bộ
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button variant="primary" onClick={handleSave} icon={<Save size={16}/>}>Lưu cấu hình</Button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 font-sans ${
          toast.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500/35 text-emerald-200' 
            : toast.type === 'error'
              ? 'bg-red-950/95 border-red-500/35 text-red-200'
              : 'bg-indigo-950/95 border-indigo-500/35 text-indigo-200'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
          <span className="text-xs font-semibold font-sans leading-normal">{toast.message}</span>
        </div>
      )}
    </Modal>
  );
};
