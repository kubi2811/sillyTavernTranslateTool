export interface LorebookEntry {
  uid: number;
  key: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  
  // Strategy & Logic
  constant: boolean; // Constant strategy
  selective: boolean; // Normal/Selective strategy
  vectorized: boolean; // Vectorized strategy
  key_logic: 'and_any' | 'and_all' | 'not_any' | 'not_all';
  
  // Order & Position
  order: number;
  position: 'before_char' | 'after_char' | 'before_em' | 'after_em' | 'before_an' | 'after_an' | 'at_depth_system' | 'at_depth_user' | 'at_depth_assistant';
  scan_depth: number; // Depth
  
  // Matching Settings
  case_sensitive: boolean;
  match_whole_words: boolean;
  
  // Toggles (Advanced)
  prevent_recursion: boolean;
  delay_until_recursion: boolean;
  non_recursable: boolean;
  ignore_budget: boolean;
  
  // Bottom Fields
  priority: number; // Prioritize (if used as sort key) or boolean flag in some implementations, keeping number for flexibility
  sticky: number;
  cooldown: number;
  delay: number;
  probability: number; // Group Weight
  
  enabled: boolean;
}

export interface Lorebook {
  name: string;
  description: string;
  entries: LorebookEntry[];
}

export interface AIPromptBlock {
  id: string;
  title: string;
  content: string;
}

export interface OpenAISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  // Advanced Configs
  contextSize: number;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  streaming: boolean;
  nsfw: boolean;
  enableSearch: boolean;
  minTokens: number; // Target length enforcement
  enableCompletenessProtocol?: boolean; // Giao thức ép buộc hoàn thiện tối đa

  // --- Multi-model & RPM concurrency (Pro = chính, Flash = phụ) ---
  // `model` ở trên là Model CHÍNH (Pro) dùng cho việc nặng: sinh entry chi tiết.
  enableSecondaryModel?: boolean; // Bật model phụ (Flash) cho các việc ngắn/nhiều
  secondaryModel?: string;        // Model PHỤ (vd: gemini-3-flash) cho phân loại/dịch tiêu đề ngắn
  primaryRpm?: number;            // Giới hạn RPM của model chính (vd: 5)
  secondaryRpm?: number;          // Giới hạn RPM của model phụ (vd: 10)
  steps?: WorldbuildingStep[]; // Custom pipeline steps for AI instruction
  requireStepConfirmation?: boolean; // Xác nhận từng bước của AI trước khi đi tiếp
  aiPipelineMemory?: string; // Tóm tắt thâm sâu quy trình đã nạp của Tawa
  aiPrompts?: AIPromptBlock[]; // AI Prompt Management Blocks
  activePromptId?: string; // Currently active system prompt block ID
  masterInstruction?: string; // "Hướng dẫn tổng" — 1 text bự, chỉ dẫn CHUNG áp dụng cho mọi bước pipeline (gộp từ 2 tab cũ)
}

export interface WorldbuildingStep {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

export interface AIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface GenerateParams {
  prompt: string;
  context?: string;
  settings: OpenAISettings;
}

// --- Worldbuilding Types ---

export type WorldbuildingMode = 'genesis' | 'evolution' | 'discussion' | 'document_extraction' | 'rework';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // Array of Base64 strings for Vision support
  timestamp: number;
  actions?: WorldbuildingAction[];
  isError?: boolean;
  isHidden?: boolean; // Used to hide large data payloads from UI
}

export interface WorldbuildingAction {
  type: 'create' | 'update' | 'delete' | 'fetch_fandom_data' | 'read_document';
  target_comment?: string; // Used for update/delete to find the entry
  data?: Partial<LorebookEntry>; // The data to create or update
  url?: string; // Used for fetch_fandom_data
  chunk_index?: number; // Used for read_document
  reason?: string; // Why Tawa did this
}

export interface WorldbuildingResponse {
  thought: string; // Tawa's internal reasoning
  message: string; // Conversational response to user
  status?: 'CONTINUE' | 'DONE'; // Used for auto_wiki mode
  actions: WorldbuildingAction[]; // List of actions to perform on the lorebook
}