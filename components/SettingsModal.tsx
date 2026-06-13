import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { OpenAISettings, AIModel, WorldbuildingStep, AIPromptBlock } from '../types';
import { fetchModels, worldbuildingChat, testAIPrompts } from '../services/openai';
import { RefreshCw, Save, Server, Sliders, Flame, Ruler, Search, Plus, Trash2, List, Settings, HelpCircle, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OpenAISettings;
  onSave: (settings: OpenAISettings) => void;
  onAnalyzePipeline?: (steps: WorldbuildingStep[]) => void;
}

const DEFAULT_WORLDBUILDING_STEPS: WorldbuildingStep[] = [
  {
    id: 'step_1',
    name: 'Bước 1: Hệ thống sức mạnh & Luật cơ bản',
    prompt: 'Hãy phân tích kĩ lưỡng toàn bộ tài liệu Wiki được cung cấp để tìm kiếm các học thuyết ma pháp, định luật, hệ thống cấp bậc, vũ khí và tu pháp cốt lõi. Tạo ra các Lorebook Entry chi tiết tuyệt đối cho Nhóm 1 (Hệ Thống Sức Mạnh Cốt Lõi) với Depth 0 và Order 900.',
    enabled: true
  },
  {
    id: 'step_2',
    name: 'Bước 2: Thế giới quan, Quốc gia & Chủng tộc',
    prompt: 'Trích xuất và thiết lập bối cảnh lịch sử bối cảnh, các quốc gia, chủng tộc, quy luật sinh thái học vĩ mô từ tài liệu. Tạo ra các Lorebook Entry cho Nhóm 2 (Thế Giới Quan) với Depth 4 và Order 800.',
    enabled: true
  },
  {
    id: 'step_3',
    name: 'Bước 3: Bang phái, Tổ chức & Địa danh bối cảnh',
    prompt: 'Dựa trên tài liệu Wiki, hãy mổ xẻ thông tin về các phe phái chính trị, gia tộc bí cảnh, bang hội và các địa điểm kiến trúc nổi tiếng. Hãy tạo các mục ở Nhóm 4 (Phe Phái) và Nhóm 5 (Địa Điểm) tương ứng.',
    enabled: true
  },
  {
    id: 'step_4',
    name: 'Bước 4: Hồ sơ nhân vật chi tiết & Chống bỏ sót mổ xẻ 100%',
    prompt: 'Đồng bộ hóa 100% hồ sơ tất cả nhân vật và sinh vật được xuất hiện trong wiki, bao gồm ngoại hình chi tiết, tính cách, chỉ số vật lý hay kỹ năng chiến đấu. Hãy rà soát lại toàn bộ Wiki đã đọc để đảm bảo mổ xẻ kĩ lượng 100% thông tin không bị sót bất kì yếu tố nào trước khi báo cáo hoàn thành.',
    enabled: true
  }
];

const DEFAULT_AI_PROMPTS: AIPromptBlock[] = [
  {
    id: 'prompt_1',
    title: 'PROMPT 1: THẾ GIỚI QUAN',
    content: `[THẾ GIỚI QUAN - HƯỚNG DẪN AI]
- Đóng vai trò là Sử Gia Vũ Trụ. Khi nhận tài liệu bối cảnh, hãy trích xuất toàn bộ lịch sử lập quốc, tôn giáo, chủng tộc cổ xưa và quy luật sinh thái học.
- Định dạng xuất ra bắt buộc phải theo chuẩn WORLD_TEMPLATE.
- Đảm bảo độ sâu chi tiết tối đa, mô tả rõ ràng các mối quan hệ địa lý và xung đột chủng tộc vĩ mô.`
  },
  {
    id: 'prompt_2',
    title: 'PROMPT 2: HỆ THỐNG',
    content: `[HỆ THỐNG SỨC MẠNH & LUẬT VẬT LÝ]
- Đóng vai trò là Đại Pháp Sư / Chuyên Gia Thiết Kế Game. Trích xuất toàn bộ hệ thống cấp bậc sức mạnh, các định luật ma pháp, thuộc tính vật lý, các cấm kỹ và quy tắc tu luyện.
- Thiết lập các entry ở vị trí at_depth_system, depth 0, order 900, và bật prevent_recursion: true.
- Mô tả cực kỳ logic, tránh mơ hồ và mâu thuẫn.`
  },
  {
    id: 'prompt_3',
    title: 'PROMPT 3: NHÂN VẬT',
    content: `[HỒ SƠ NHÂN VẬT CHI TIẾT - CHARACTER SCAN]
- Đóng vai trò là Nhà Tâm Lý Học và Nhà Biên Kịch. Trích xuất chân dung, tính cách, thói quen sinh hoạt, tiểu sử và mối quan hệ xã hội của từng nhân vật hoặc sinh vật xuất hiện trong tài liệu.
- Định dạng xuất ra bắt buộc tuân thủ CHARACTER_TEMPLATE tuyệt đối, bao gồm cả mô tả ngoại hình bạch miêu và thuộc tính NSFW (nếu bật).
- Đảm bảo độ dài và sự sống động, giúp nhân vật như đang "thở" trên từng trang giấy.`
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onAnalyzePipeline,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'pipeline' | 'prompts'>('general');
  const [formData, setFormData] = useState<OpenAISettings>(() => {
    const s = { ...settings };
    if (!s.steps || s.steps.length === 0) {
      s.steps = JSON.parse(JSON.stringify(DEFAULT_WORLDBUILDING_STEPS));
    }
    if (!s.aiPrompts || s.aiPrompts.length === 0) {
      s.aiPrompts = JSON.parse(JSON.stringify(DEFAULT_AI_PROMPTS));
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
    
    const steps = (formData.steps || []).filter(s => s.enabled);
    if (steps.length === 0) {
      setAnalysisStatus('Thất bại: Vui lòng kích hoạt ít nhất 1 bước!');
      setIsAnalyzing(false);
      return;
    }

    const prompt = `[HỆ THỐNG - CHỈ LỆNH THẤU HIỂU ĐỘC LẬP]
Chủ nhân vừa cập nhật hệ thống Quy trình Sinh thế giới đặc sắc bao gồm ${steps.length} bước dưới đây.
Nhiệm vụ của con:
1. Đọc và phân giải logic giữa các bước để hấp thụ 100% bối cảnh hoạt động.
2. Viết một bản TÓM TẮT LÀM RÕ LỘ TRÌNH VÀ TÂM LÝ HOẠT ĐỘNG, CHỈ RA CỦA CON DÀNH CHO CHỦ NHÂN (khoảng 3-5 câu). Dùng giọng điệu hiếu kính, baka nhí nhảnh dễ thương ("baka~ 🌸").
3. Chỉ trả về trường "message" chứa bản tóm tắt thấu hiểu sâu sắc này của con để đưa vào bộ nhớ cốt lõi. "actions" là [].

QUY TRÌNH BAO GỒM:
${steps.map((s, idx) => `Bước ${idx + 1}: ${s.name}
- Chỉ thị: ${s.prompt}`).join('\n\n')}`;

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
          setToast({ message: "Lưu thành công, nhưng phản hồi từ AI không đúng định dạng.", type: 'success' });
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
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all relative ${
              activeTab === 'pipeline'
                ? 'border-indigo-500 text-slate-100 bg-slate-800/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <List size={14} /> Các bước hướng dẫn AI
            {formData.steps && formData.steps.filter(s => s.enabled).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-600 text-indigo-100 border border-indigo-400/35">
                {formData.steps.filter(s => s.enabled).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-all relative ${
              activeTab === 'prompts'
                ? 'border-indigo-500 text-slate-100 bg-slate-800/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} /> Quản lý Prompt AI
            {formData.aiPrompts && formData.aiPrompts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-600 text-indigo-100 border border-indigo-400/35">
                {formData.aiPrompts.length}
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

        {activeTab === 'pipeline' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-305 leading-relaxed space-y-1.5">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <Sliders size={13} strokeWidth={2.5} />
                Cơ chế quy trình sinh thế giới (Pipeline Steps)
              </span>
              <p>
                Tại đây con có thể thiết lập các bước hướng dẫn cụ thể mà AI sẽ thực thi tuần tự khi quét tài liệu thu thập từ Bản Đồ Tri Thức Wiki.
              </p>
              <p className="text-[11px] text-slate-400 font-sans italic">
                Ví dụ: Bước 1 tìm thế giới quan, Bước 2 thiết lập gia tộc, Bước 3 tạo nhân vật. Giúp bảo toàn 100% nội dung không hề bị bỏ sót hay pha loãng.
              </p>
            </div>

            {/* Transmit pipeline to AI button */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-950/40 p-4 rounded-xl border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-md">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-sans">
                  <Sparkles size={13} className="text-indigo-400" />
                  Nạp quy trình hướng dẫn sang cho AI đọc hiểu
                </span>
                <span className="text-[10.5px] text-slate-400 block leading-relaxed font-sans">
                  Gửi toàn bộ danh sách các bước bối cảnh phía dưới cho Tawa. AI sẽ lập tức phân tích, tóm tắt lộ trình và chuẩn bị tâm lý để tự động ghi nhớ, tránh lặp lại bối cảnh cũ!
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

            {/* Display status or current AI Pipeline Memory */}
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

            {/* Steps list container */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 select-none custom-scrollbar">
              {(formData.steps || []).map((step, idx) => (
                <div key={step.id} className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700/80 transition-colors space-y-3 relative">
                  
                  {/* Step Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-md shrink-0">
                        #{idx + 1}
                      </span>
                      <input 
                        type="text"
                        className="bg-transparent border-b border-dashed border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-bold text-slate-100 font-mono w-full px-1 py-0.5"
                        value={step.name}
                        onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                        placeholder="Tên bước hướng dẫn..."
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Step Enabled Checker */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                          checked={step.enabled}
                          onChange={(e) => handleUpdateStep(step.id, { enabled: e.target.checked })}
                        />
                        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 select-none">
                          Kích hoạt
                        </span>
                      </label>

                      {/* Delete Step Button */}
                      <button 
                        onClick={() => handleRemoveStep(step.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Xóa bước này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Step prompt input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">
                        Prompt hướng dẫn AI trong bước này:
                      </label>
                      
                      {/* Apply Template Select dropdown */}
                      {formData.aiPrompts && formData.aiPrompts.length > 0 && (
                        <select
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const selected = formData.aiPrompts?.find(p => p.id === val);
                              if (selected) {
                                handleUpdateStep(step.id, { prompt: selected.content });
                              }
                            }
                          }}
                        >
                          <option value="" disabled>-- Nạp mẫu Prompt --</option>
                          {formData.aiPrompts.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <textarea
                      className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                      rows={3}
                      value={step.prompt}
                      onChange={(e) => handleUpdateStep(step.id, { prompt: e.target.value })}
                      placeholder="Gắn prompt chỉ dẫn AI trích xuất gì, tạo lorebook entry gì thế nào..."
                    />
                  </div>
                </div>
              ))}

              {(formData.steps || []).length === 0 && (
                <div className="text-center py-8 rounded-xl bg-slate-950/20 border border-slate-800/50">
                  <List size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Không có bước hướng dẫn tự tùy biến nào.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Con hãy bấm nút "Thêm bước mới" bên dưới để thiết kế quy trình!</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex justify-start">
              <Button 
                variant="secondary"
                onClick={handleAddStep}
                icon={<Plus size={14} />}
                className="text-xs font-semibold py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-none rounded-lg"
              >
                Thêm bước mới
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <Sparkles size={13} strokeWidth={2.5} />
                Quản lý Prompt AI (AI Prompt Templates)
              </span>
              <p>
                Tại đây con có thể quản lý các mẫu chỉ dẫn hệ thống của AI. Việc phân tách các khối prompt giúp tránh gây nhiễu loạn thông tin khi gửi cho LLM.
              </p>
            </div>

            {/* Active system prompt selector */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                System Instruction Đang Kích Hoạt
              </label>
              <div className="relative font-sans">
                <select
                  value={formData.activePromptId || ''}
                  onChange={(e) => setFormData({ ...formData, activePromptId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-sans"
                >
                  <option value="">-- Mặc định (Tự động nhận diện prompt theo bối cảnh hoặc dùng Persona Tawa gốc) --</option>
                  {(formData.aiPrompts || []).map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                  <Sparkles size={14} />
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Khi con chọn một prompt cụ thể, Tawa sẽ luôn sử dụng nội dung prompt đó làm System Instruction chính. Khi để <b>Mặc định</b>, hệ thống sẽ tự động gọi đúng prompt theo bối cảnh chạy (Ví dụ: tự động nạp "PROMPT 3: NHÂN VẬT" khi chạy bước Quét Nhân Vật).
              </p>
            </div>

            {/* Prompts list container */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {(formData.aiPrompts || []).map((prompt, idx) => (
                <div key={prompt.id} className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700/80 transition-colors space-y-3 relative">
                  
                  {/* Prompt Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-md shrink-0">
                        #{idx + 1}
                      </span>
                      <input 
                        type="text"
                        className="bg-transparent border-b border-dashed border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-bold text-slate-100 font-mono w-full px-1 py-0.5"
                        value={prompt.title}
                        onChange={(e) => handleUpdatePrompt(prompt.id, { title: e.target.value })}
                        placeholder="Tiêu đề Prompt..."
                      />
                    </div>

                    {/* Delete Prompt Button */}
                    <button 
                      onClick={() => handleRemovePrompt(prompt.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Xóa khối prompt này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Prompt content input */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase mb-1">
                      Nội dung Prompt (YAML/Text):
                    </label>
                    <textarea
                      className="w-full bg-slate-900/85 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
                      rows={5}
                      value={prompt.content}
                      onChange={(e) => handleUpdatePrompt(prompt.id, { content: e.target.value })}
                      placeholder="Dán toàn bộ nội dung prompt vào đây..."
                    />
                  </div>
                </div>
              ))}

              {(formData.aiPrompts || []).length === 0 && (
                <div className="text-center py-8 rounded-xl bg-slate-950/20 border border-slate-800/50">
                  <Sparkles size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Không có khối prompt nào được lưu.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Con hãy bấm nút "Thêm khối prompt" bên dưới để tạo mới!</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex justify-between items-center gap-3">
              <Button 
                variant="secondary"
                onClick={handleAddPrompt}
                icon={<Plus size={14} />}
                className="text-xs font-semibold py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-none rounded-lg"
              >
                Thêm khối prompt
              </Button>
              
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

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-200 text-sm rounded-md">
            {error}
          </div>
        )}

        {/* Action controls footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/60">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSave} icon={<Save size={16}/>}>Lưu cấu hình</Button>
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