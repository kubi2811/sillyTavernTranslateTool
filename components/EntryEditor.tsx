import React, { useState, useEffect } from 'react';
import { LorebookEntry, OpenAISettings } from '../types';
import { Input, Textarea } from './ui/Input';
import { Button } from './ui/Button';
import { 
  Wand2, BrainCircuit, Target, Key, Settings2, Eye, 
  ShieldAlert, Layers, Sparkles, CheckCircle2, AlertCircle, 
  RotateCw, HelpCircle, Check, ListChecks
} from 'lucide-react';
import { analyzeTechnicalSettings, TechnicalAnalysisResponse } from '../services/openai';
import { getOptimizedEntrySettings } from '../utils/optimize';

interface EntryEditorProps {
  entry: LorebookEntry | null;
  onChange: (updatedEntry: LorebookEntry) => void;
  onOpenAI: () => void;
  settings: OpenAISettings;
}

export const EntryEditor: React.FC<EntryEditorProps> = ({ entry, onChange, onOpenAI, settings }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'position' | 'keywords' | 'advanced'>('general');
  
  // Tawa Technical Advisor states
  const [advisorMethod, setAdvisorMethod] = useState<'instant' | 'ai'>('instant');
  const [aiAnalysis, setAiAnalysis] = useState<TechnicalAnalysisResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [errorAI, setErrorAI] = useState<string | null>(null);

  // Reset AI states when selected entry changes
  useEffect(() => {
    setAiAnalysis(null);
    setErrorAI(null);
  }, [entry?.uid]);

  if (!entry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 text-slate-500 p-8">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
           <Wand2 size={40} className="text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-400 mb-2">Chưa chọn mục nào</h3>
        <p className="text-center max-w-sm">
          Chọn một mục từ danh sách hoặc tạo mới. Hãy để AI giúp bạn thiết lập mọi thứ!
        </p>
      </div>
    );
  }

  const handleChange = (field: keyof LorebookEntry, value: any) => {
    onChange({ ...entry, [field]: value });
  };

  const handleArrayChange = (field: 'key' | 'secondary_keys', value: string) => {
    const array = value.split(',').map(s => s.trim()).filter(s => s !== '');
    onChange({ ...entry, [field]: array });
  };

  // Helper to determine active strategy for UI display
  const getStrategy = () => {
    if (entry.constant) return 'constant';
    if (entry.vectorized) return 'vectorized';
    return 'normal';
  };

  const setStrategy = (val: string) => {
    onChange({
      ...entry,
      constant: val === 'constant',
      selective: val === 'normal',
      vectorized: val === 'vectorized'
    });
  };

  // Heuristic rule-based recommendations for instant zero-lag advice
  const getInstantRecommendations = () => {
    return getOptimizedEntrySettings(entry.comment, entry.content);
  };

  const handleRunAIAnalysis = async () => {
    if (!settings.apiKey) {
      setErrorAI("Vui lòng nhập API Key trong phần Cài đặt trước.");
      return;
    }
    setLoadingAI(true);
    setErrorAI(null);
    try {
      const res = await analyzeTechnicalSettings(entry, settings);
      setAiAnalysis(res);
    } catch (err: any) {
      setErrorAI(err.message || "Không thể tải phân tích từ Tawa. Thử lại sau nhé.");
    } finally {
      setLoadingAI(false);
    }
  };

  const currentRec = advisorMethod === 'ai' && aiAnalysis ? aiAnalysis : getInstantRecommendations();

  // Helper translations for UI comparison
  const getPositionLabel = (posName: string) => {
    switch (posName) {
      case 'before_char': return 'Trước định nghĩa NV';
      case 'after_char': return 'Sau định nghĩa NV';
      case 'before_an': return "Trước Author's Note";
      case 'after_an': return "Sau Author's Note";
      case 'before_em': return 'Trước tin mẫu';
      case 'after_em': return 'Sau tin mẫu';
      case 'at_depth_system': return 'Hệ thống (System)';
      case 'at_depth_user': return 'At Depth (User)';
      case 'at_depth_assistant': return 'At Depth (Assistant)';
      default: return posName;
    }
  };

  const applyRecommendations = () => {
    onChange({
      ...entry,
      position: currentRec.position,
      scan_depth: currentRec.scan_depth,
      order: currentRec.order,
      prevent_recursion: currentRec.prevent_recursion,
      non_recursable: currentRec.non_recursable,
      delay_until_recursion: currentRec.delay_until_recursion,
      ignore_budget: currentRec.ignore_budget,
      constant: currentRec.constant !== undefined ? currentRec.constant : entry.constant,
      selective: currentRec.selective !== undefined ? currentRec.selective : entry.selective,
      vectorized: (currentRec.constant || currentRec.selective) ? false : entry.vectorized
    });
  };

  const checkMatches = (field: keyof LorebookEntry, recVal: any) => {
    return entry[field] === recVal;
  };

  const isAllOptimized = () => {
    return (
      checkMatches('position', currentRec.position) &&
      checkMatches('scan_depth', currentRec.scan_depth) &&
      checkMatches('order', currentRec.order) &&
      checkMatches('prevent_recursion', currentRec.prevent_recursion) &&
      checkMatches('non_recursable', currentRec.non_recursable) &&
      (currentRec.constant === undefined || checkMatches('constant', currentRec.constant)) &&
      (currentRec.selective === undefined || checkMatches('selective', currentRec.selective))
    );
  };

  const renderTawaAdvisor = () => {
    const instantRecs = getInstantRecommendations();
    return (
      <div className="bg-slate-800/40 p-6 rounded-xl border border-indigo-500/25 shadow-lg mt-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Sparkles className="text-indigo-400" size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Trợ lý Cấu hình Kỹ thuật Tawa
                <span className="text-xs bg-indigo-900/50 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                  {advisorMethod === 'instant' ? "⚡ Instant" : "🧠 AI Deep Expert"}
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Đề xuất Vị trí, Độ sâu (Depth) và Đệ quy dựa trên luật hoạt động chính thống của SillyTavern.
              </p>
            </div>
          </div>

          {/* Toggle Advisor Modes */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setAdvisorMethod('instant')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                advisorMethod === 'instant' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Heuristic
            </button>
            <button
              onClick={() => setAdvisorMethod('ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                advisorMethod === 'ai' 
                  ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧠 Deep AI
            </button>
          </div>
        </div>

        {advisorMethod === 'ai' && !aiAnalysis && !loadingAI && (
          <div className="bg-slate-900/40 rounded-lg border border-slate-700/50 p-6 text-center space-y-3 animate-in fade-in duration-200">
            <BrainCircuit className="text-indigo-400/80 mx-auto animate-pulse" size={32} />
            <h5 className="text-sm font-semibold text-slate-200">Suy luận Phân tích Chuyên sâu với AI</h5>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sử dụng mô hình ngôn ngữ lớn để đọc cặn kẽ nội dung entry, giúp nhận dạng và đưa ra cấu hình đệ quy tương tác cùng khoảng cách Depth chính xác tuyệt đối.
            </p>
            {settings.apiKey ? (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleRunAIAnalysis}
                className="mt-2 border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-300 px-4 py-1.5"
                icon={<RotateCw size={12} className="animate-pulse" />}
              >
                Hỏi Tawa phân tích sâu
              </Button>
            ) : (
              <p className="text-xs text-amber-400 mt-2 bg-amber-950/30 border border-amber-500/30 py-1.5 rounded-md w-fit mx-auto px-4">
                ⚠️ Chức năng này yêu cầu API Key. Vui lòng thiết lập ở hình Bánh răng trên thanh tiêu đề.
              </p>
            )}
            {errorAI && <p className="text-xs text-red-400">{errorAI}</p>}
          </div>
        )}

        {advisorMethod === 'ai' && loadingAI && (
          <div className="bg-slate-900/40 rounded-lg border border-slate-700/50 p-8 text-center space-y-4 animate-pulse">
            <RotateCw className="text-indigo-400 mx-auto animate-spin" size={36} />
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-indigo-300 animate-pulse font-sans">Tawa đang phân tích bối cảnh...</h5>
              <p className="text-xs text-slate-500 font-mono">Đo quét đệ quy và sơ đồ prompt nạp cho nhân vật</p>
            </div>
          </div>
        )}

        {/* Display recommendations if analytical results are ready or if using Heuristics */}
        {(advisorMethod === 'instant' || (advisorMethod === 'ai' && aiAnalysis)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Left: Summary Metrics */}
            <div className="md:col-span-2 space-y-4 bg-slate-900/30 p-4 rounded-lg border border-slate-700/30">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
                <span>So sánh bối cảnh & tối ưu</span>
                {advisorMethod === 'instant' && (
                  <span className="text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/20 font-sans font-medium">
                    Phân loại: {instantRecs.categoryName}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-700/40 space-y-2 [&>div]:pt-2 [&>div:first-child]:pt-0">
                {/* STRATEGY */}
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-300 font-medium">Chiến lược kích hoạt (Strategy)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {entry.constant ? "Hằng số (Constant)" : entry.vectorized ? "Vector" : "Normal"}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-semibold px-2 py-0.5 rounded ${
                      ((currentRec.constant && entry.constant) || (currentRec.selective && entry.selective))
                        ? 'text-green-400 bg-green-950/20 border border-green-500/25' 
                        : 'text-indigo-300 bg-indigo-900/30 border border-indigo-500/20'
                    }`}>
                      {currentRec.constant ? "Hằng số (Constant)" : "Normal"}
                    </span>
                    {((currentRec.constant && entry.constant) || (currentRec.selective && entry.selective)) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-indigo-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* POSITION */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium font-sans">Vị trí chèn (Position)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 truncate">{getPositionLabel(entry.position)}</span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-semibold px-2 py-0.5 rounded ${checkMatches('position', currentRec.position) ? 'text-green-400 bg-green-950/20 border border-green-500/25' : 'text-indigo-300 bg-indigo-900/30 border border-indigo-500/20'}`}>
                      {getPositionLabel(currentRec.position)}
                    </span>
                    {checkMatches('position', currentRec.position) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-indigo-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* DEPTH */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium font-sans">Mức quét (Depth)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">{entry.scan_depth}</span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${checkMatches('scan_depth', currentRec.scan_depth) ? 'text-green-400 bg-green-950/20' : 'text-pink-300 bg-pink-900/30'}`}>
                      {currentRec.scan_depth}
                    </span>
                    {checkMatches('scan_depth', currentRec.scan_depth) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-pink-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* ORDER */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium font-sans">Thứ tự ưu tiên (Order)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">{entry.order}</span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${checkMatches('order', currentRec.order) ? 'text-green-400 bg-green-950/20' : 'text-blue-300 bg-blue-900/30'}`}>
                      {currentRec.order}
                    </span>
                    {checkMatches('order', currentRec.order) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-blue-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* PREVENT RECURSION */}
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-300 font-medium">Chặn đệ quy ra (Prevent Recursion)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{entry.prevent_recursion ? "BẬT" : "TẮT"}</span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-semibold px-2 py-0.5 rounded ${checkMatches('prevent_recursion', currentRec.prevent_recursion) ? 'text-green-400 bg-green-950/20' : 'text-amber-300 bg-amber-900/30'}`}>
                      {currentRec.prevent_recursion ? "BẬT" : "TẮT"}
                    </span>
                    {checkMatches('prevent_recursion', currentRec.prevent_recursion) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-amber-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* NON-RECURSABLE */}
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-300 font-medium">Chặn đệ quy vào (Non-recursable)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{entry.non_recursable ? "BẬT" : "TẮT"}</span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-semibold px-2 py-0.5 rounded ${checkMatches('non_recursable', currentRec.non_recursable) ? 'text-green-400 bg-green-950/20' : 'text-purple-300 bg-purple-900/30'}`}>
                      {currentRec.non_recursable ? "BẬT" : "TẮT"}
                    </span>
                    {checkMatches('non_recursable', currentRec.non_recursable) ? (
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-purple-400 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Explanation & Recommendation Action */}
            <div className="flex flex-col justify-between bg-slate-900/20 p-4 rounded-lg border border-slate-700/30 gap-4">
              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-400 block flex items-center gap-1 font-sans">
                  <HelpCircle size={12} /> Lý do đề xuất
                </span>
                <p className="text-xs text-slate-300 leading-relaxed italic font-sans font-normal">
                  "{advisorMethod === 'ai' && aiAnalysis ? aiAnalysis.thought : instantRecs.reason}"
                </p>
              </div>

              <div className="pt-2">
                {isAllOptimized() ? (
                  <div className="w-full bg-green-950/20 border border-green-500/30 text-green-400 rounded-lg p-2.5 text-center flex items-center justify-center gap-2 text-xs font-semibold">
                    <Check size={14} strokeWidth={2.5} /> Sơ đồ đã chuẩn tối ưu!
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 border-none text-white hover:from-indigo-500 hover:to-purple-500 shadow-md font-bold text-xs py-2 scale-100 hover:scale-[1.02] active:scale-95 transition-all"
                    onClick={applyRecommendations}
                    icon={<CheckCircle2 size={14} />}
                  >
                    Áp dụng cấu hình
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              {entry.comment || "Chưa đặt tên"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">UID: {entry.uid}</span>
              <span className="text-slate-600">|</span>
              <span className={entry.enabled ? "text-green-400" : "text-slate-500"}>
                {entry.enabled ? "Đang hoạt động" : "Đã tắt"}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
             <Button 
                variant="secondary" 
                onClick={onOpenAI}
                className="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
                icon={<Wand2 size={16}/>}
              >
                Tawa Tự động hóa
              </Button>
             <label className="flex items-center cursor-pointer gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20 font-medium text-sm select-none">
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={entry.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                />
                {entry.enabled ? "Đang BẬT" : "Đang TẮT"}
             </label>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 w-fit">
          {[
            { id: 'general', icon: <Eye size={16}/>, label: 'Nội dung' },
            { id: 'position', icon: <Target size={16}/>, label: 'Vị trí & Order' },
            { id: 'keywords', icon: <Key size={16}/>, label: 'Từ khóa' },
            { id: 'advanced', icon: <Settings2 size={16}/>, label: 'Nâng cao' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Tên gợi nhớ (Comment)" 
                  placeholder="Ví dụ: Cốt lõi - Đùi & Tâm lý" 
                  value={entry.comment}
                  onChange={(e) => handleChange('comment', e.target.value)}
                />
                
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">Chiến lược (Strategy)</label>
                   <select 
                     className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                     value={getStrategy()}
                     onChange={(e) => setStrategy(e.target.value)}
                   >
                     <option value="constant">Constant (Luôn luôn - Hằng số)</option>
                     <option value="normal">Normal (Kích hoạt bằng từ khóa)</option>
                     <option value="vectorized">Vectorized (Tìm kiếm ngữ nghĩa)</option>
                   </select>
                   <p className="text-xs text-slate-500 mt-1">
                     {getStrategy() === 'constant' && "Luôn xuất hiện trong bộ nhớ, dùng cho sự thật hiển nhiên."}
                     {getStrategy() === 'normal' && "Chỉ xuất hiện khi tìm thấy Keyword. Tiết kiệm bộ nhớ nhất."}
                     {getStrategy() === 'vectorized' && "Dùng AI tìm ý nghĩa tương đồng, không cần đúng chính tả."}
                   </p>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between">
                  <span>Nội dung Lorebook</span>
                  <span className="text-xs text-slate-500 font-normal">AI sẽ tự động viết phần này</span>
                </label>
                <textarea
                  className="w-full h-[400px] bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono leading-relaxed resize-none custom-scrollbar shadow-inner"
                  value={entry.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Nội dung entry sẽ hiển thị ở đây..."
                />
              </div>
            </div>
          )}

          {/* TAB: POSITION */}
          {activeTab === 'position' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Layers className="text-indigo-400"/> Vị trí chèn (Position)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-slate-300 mb-1">Vị trí cơ bản</label>
                       <select
                         className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                         value={entry.position}
                         onChange={(e) => handleChange('position', e.target.value)}
                       >
                         <optgroup label="Nhân vật & Mẫu">
                           <option value="before_char">Before Character Defs (Trước định nghĩa NV)</option>
                           <option value="after_char">After Character Defs (Sau định nghĩa NV)</option>
                           <option value="before_em">Before Example Messages</option>
                           <option value="after_em">After Example Messages</option>
                         </optgroup>
                         <optgroup label="Ghi chú tác giả">
                           <option value="before_an">Before Author's Note</option>
                           <option value="after_an">After Author's Note</option>
                         </optgroup>
                         <optgroup label="Độ sâu (At Depth)">
                           <option value="at_depth_system">At Depth (System) - Luật bắt buộc</option>
                           <option value="at_depth_user">At Depth (User) - Giả lập user</option>
                           <option value="at_depth_assistant">At Depth (Assistant) - Giả lập AI</option>
                         </optgroup>
                       </select>
                    </div>

                    <div>
                       <label className="block text-sm font-medium text-slate-300 mb-1">Khoảng cách (Depth)</label>
                       <div className="flex items-center gap-4">
                         <input
                           type="number"
                           className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={entry.scan_depth}
                           onChange={(e) => handleChange('scan_depth', parseInt(e.target.value) || 0)}
                         />
                         <div className="text-xs text-slate-500 w-full">
                           0 = Ngay tin nhắn mới nhất.<br/>
                           4 = Kiến thức nền/Giác quan.
                         </div>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-pink-400"/> Thứ tự ưu tiên (Order)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                     <div>
                       <label className="block text-sm font-medium text-slate-300 mb-1">Order</label>
                       <input
                         type="number"
                         className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                         value={entry.order}
                         onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
                       />
                     </div>
                     <div className="text-sm text-slate-400 leading-relaxed">
                        Số càng cao càng được ưu tiên (ghi đè lên số thấp).<br/>
                        <span className="text-indigo-400">100</span>: Cốt lõi.<br/>
                        <span className="text-pink-400">101+</span>: Luật cấm/Quy tắc tuyệt đối.
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: KEYWORDS */}
          {activeTab === 'keywords' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/30">
                  <p className="text-sm text-slate-400 mb-4">
                    Nếu chọn Strategy là <span className="text-indigo-400 font-bold">Normal</span>, entry chỉ kích hoạt khi tìm thấy các từ khóa này.
                  </p>
                  <Input 
                    label="Từ khóa chính (Primary Keywords)" 
                    placeholder="Cô ấy, Nữ, Đùi, Bắp đùi, Tuyệt đối lĩnh vực..." 
                    value={entry.key.join(', ')}
                    onChange={(e) => handleArrayChange('key', e.target.value)}
                    className="mb-4"
                  />
                  
                  <Input 
                    label="Từ khóa phụ (Secondary Keys)" 
                    placeholder="Kích hoạt thêm..." 
                    value={entry.secondary_keys.join(', ')}
                    onChange={(e) => handleArrayChange('secondary_keys', e.target.value)}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Logic kết hợp</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={entry.key_logic}
                      onChange={(e) => handleChange('key_logic', e.target.value)}
                    >
                      <option value="and_any">AND ANY (Chứa 1 trong các từ)</option>
                      <option value="and_all">AND ALL (Chứa tất cả các từ)</option>
                      <option value="not_any">NOT ANY (Không chứa từ nào)</option>
                      <option value="not_all">NOT ALL (Không chứa tất cả)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                        checked={entry.match_whole_words}
                        onChange={(e) => handleChange('match_whole_words', e.target.checked)}
                      />
                      <span className="text-sm text-slate-300">Match Whole Words (Bắt từ nguyên vẹn)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                        checked={entry.case_sensitive}
                        onChange={(e) => handleChange('case_sensitive', e.target.checked)}
                      />
                      <span className="text-sm text-slate-300">Case Sensitive (Phân biệt hoa thường)</span>
                    </label>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Recursion Settings */}
                  <div className="bg-slate-800/30 p-5 rounded-lg border border-slate-700/50">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase mb-4 tracking-wider">Đệ quy (Recursion)</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/30 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          checked={entry.non_recursable}
                          onChange={(e) => handleChange('non_recursable', e.target.checked)}
                        />
                        <div>
                          <span className="block text-sm font-medium text-slate-200">Non-recursable (Chặn đầu vào)</span>
                          <span className="block text-xs text-slate-500">Không cho phép mục khác kích hoạt mục này.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/30 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          checked={entry.prevent_recursion}
                          onChange={(e) => handleChange('prevent_recursion', e.target.checked)}
                        />
                        <div>
                          <span className="block text-sm font-medium text-slate-200">Prevent further recursion (Chặn đầu ra)</span>
                          <span className="block text-xs text-slate-500">Sau khi kích hoạt mục này, dừng quét thêm.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/30 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          checked={entry.delay_until_recursion}
                          onChange={(e) => handleChange('delay_until_recursion', e.target.checked)}
                        />
                         <div>
                          <span className="block text-sm font-medium text-slate-200">Delay until recursion</span>
                          <span className="block text-xs text-slate-500">Chờ quét hết đệ quy mới chèn.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Budget & Probability */}
                  <div className="bg-slate-800/30 p-5 rounded-lg border border-slate-700/50">
                    <h4 className="text-sm font-bold text-pink-400 uppercase mb-4 tracking-wider">Hiệu năng & Tác động</h4>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/30 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded bg-slate-700 border-slate-600 text-pink-600 focus:ring-pink-500"
                          checked={entry.ignore_budget}
                          onChange={(e) => handleChange('ignore_budget', e.target.checked)}
                        />
                         <div>
                          <span className="block text-sm font-medium text-slate-200">Ignore Budget (Thẻ VIP)</span>
                          <span className="block text-xs text-slate-500">Luôn chèn vào context kể cả khi hết ngân sách.</span>
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Sticky (Độ dính)</label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                            value={entry.sticky}
                            onChange={(e) => handleChange('sticky', parseInt(e.target.value) || 0)}
                          />
                        </div>
                         <div>
                          <label className="block text-xs text-slate-400 mb-1">Cooldown (Hồi chiêu)</label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                            value={entry.cooldown}
                            onChange={(e) => handleChange('cooldown', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                       <div>
                          <label className="block text-xs text-slate-400 mb-1">Probability (Tỉ lệ xuất hiện %)</label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                            value={entry.probability}
                            onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
                          />
                        </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* PERSISTENT TAWA TECHNICAL ADVISOR CARD */}
          {renderTawaAdvisor()}
        </div>
      </div>
    </div>
  );
};