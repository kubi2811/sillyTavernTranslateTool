import { LorebookEntry } from '../types';

export interface OptimizedSettings {
  position: LorebookEntry['position'];
  scan_depth: number;
  order: number;
  prevent_recursion: boolean;
  non_recursable: boolean;
  delay_until_recursion: boolean;
  ignore_budget: boolean;
  constant: boolean;
  selective: boolean;
  reason: string;
  categoryName: string;
}

export function getOptimizedEntrySettings(comment: string, content: string): OptimizedSettings {
  const contentLower = (content || '').toLowerCase();
  const commentLower = (comment || '').toLowerCase();
  
  let recPosition: LorebookEntry['position'] = 'after_char';
  let recScanDepth = 2;
  let recOrder = 99;
  let recPreventRecursion = true; // Forced true per guide
  let recNonRecursable = true; // Forced true per guide
  let recDelayUntilRecursion = false;
  let recIgnoreBudget = false;
  let recConstant = false;
  let recSelective = true;
  let reason = '';
  let categoryName = '';

  // 1. Nhóm đặc biệt: Giải thích lần hai (D0) / Chỉ đạo hành vi
  if (
    commentLower.includes('giải thích lần hai') || commentLower.includes('secondary explanation') || 
    commentLower.includes('d0') || commentLower.includes('chỉ đạo') || commentLower.includes('hành vi') ||
    contentLower.includes('giải thích lần hai') || contentLower.includes('chỉ đạo hành vi') || contentLower.includes('dự định hành vi')
  ) {
    recPosition = 'at_depth_system';
    recScanDepth = 0;
    recOrder = 1;
    recConstant = false;
    recSelective = true;
    categoryName = 'Nhóm đặc biệt: Giải thích lần hai (D0)';
    reason = 'Được nhận định là Giải thích lần hai hoặc Chỉ đạo hành vi (D0). Đặt ở Bánh răng D độ sâu 0 (at_depth_system, depth 0, order 1) để điều chỉnh trực tiếp hành vi AI tại vị trí đọc cuối cùng.';
  }
  // 2. Nhóm 1: Thế giới quan lớn / Tổng cương / Bối cảnh vĩ mô / Hệ thống ma thuật
  else if (
    commentLower.includes('tổng cương') || commentLower.includes('thế giới quan') || commentLower.includes('bối cảnh vĩ mô') ||
    commentLower.includes('quy luật') || commentLower.includes('quy tắc thế giới') || commentLower.includes('lịch sử vĩ mô') ||
    commentLower.includes('hệ thống sức mạnh') || commentLower.includes('ma thuật học') || commentLower.includes('định luật') ||
    commentLower.includes('tu luyện') || commentLower.includes('cảnh giới') || commentLower.includes('chủng tộc') ||
    commentLower.includes('tôn giáo vĩ mô') ||
    contentLower.includes('tổng cương thế giới') || contentLower.includes('quy luật tự nhiên')
  ) {
    recPosition = 'before_char';
    recScanDepth = 4;
    recOrder = 1; // 1-3
    recConstant = true;
    recSelective = false;
    categoryName = 'Nhóm 1: Thế giới quan & Tổng cương';
    reason = 'Được nhận định là Thế giới quan vĩ mô hoặc Tổng cương bối cảnh. Đặt trước nhân vật (Before Character, Order 1) dưới dạng thường trú (Constant) để làm nền tảng hiểu biết cho AI.';
  }
  // 3. Nhóm 2: Xem lướt nhân vật & thế lực
  else if (
    commentLower.includes('xem lướt') || commentLower.includes('tóm tắt nhân vật') || commentLower.includes('danh sách nhân vật') ||
    commentLower.includes('tóm tắt thế lực') || commentLower.includes('danh sách thế lực') ||
    contentLower.includes('xem lướt nhân vật') || contentLower.includes('danh sách nhân vật')
  ) {
    recPosition = 'before_char';
    recScanDepth = 4;
    recOrder = 4;
    recConstant = true;
    recSelective = false;
    categoryName = 'Nhóm 2: Xem lướt nhân vật & thế lực';
    reason = 'Được nhận định là Xem lướt nhân vật hoặc thế lực. Đặt trước nhân vật (Before Character, Order 4) dưới dạng thường trú (Constant) để AI luôn biết trong thế giới có những thực thể nào.';
  }
  // 4. Nhóm 4: Cảnh vật & Chi tiết sự kiện
  else if (
    commentLower.includes('cảnh vật') || commentLower.includes('địa danh') || commentLower.includes('sự kiện') ||
    commentLower.includes('phòng ốc') || commentLower.includes('thư viện') || commentLower.includes('dinh thự') ||
    commentLower.includes('vương quốc') || commentLower.includes('đế quốc') || commentLower.includes('live house') ||
    commentLower.includes('khu vực') || commentLower.includes('địa điểm') || commentLower.includes('bản đồ') ||
    contentLower.includes('cảnh vật') || contentLower.includes('địa điểm chi tiết')
  ) {
    recPosition = 'after_char';
    recScanDepth = 2;
    recOrder = 80; // 50-98
    recConstant = false;
    recSelective = true;
    categoryName = 'Nhóm 4: Cảnh vật & Chi tiết sự kiện';
    reason = 'Được nhận định là Cảnh vật hoặc Chi tiết sự kiện. Đặt sau nhân vật (After Character, Depth 2, Order 80) dưới dạng kích hoạt bằng từ khóa (Selective) để tiết kiệm token khi không hoạt động tại đây.';
  }
  // 5. Nhóm 5: Tài liệu NPC
  else if (
    commentLower.includes('npc') || commentLower.includes('nhân vật phụ') || commentLower.includes('vai phụ') ||
    commentLower.includes('cô giáo') || commentLower.includes('thầy giáo') || commentLower.includes('vệ binh') ||
    commentLower.includes('người hầu') || commentLower.includes('quái vật phụ')
  ) {
    recPosition = 'after_char';
    recScanDepth = 2;
    recOrder = 100;
    recConstant = false;
    recSelective = true;
    categoryName = 'Nhóm 5: Tài liệu NPC';
    reason = 'Được nhận định là NPC (Nhân vật phụ). Đặt sau nhân vật (After Character, Depth 2, Order 100) dưới dạng kích hoạt bằng từ khóa (Selective) để chỉ tải lên khi nhắc tới.';
  }
  // 6. Nhóm 3: Chi tiết nhân vật cốt lõi (Mặc định)
  else {
    recPosition = 'after_char';
    recScanDepth = 2;
    recOrder = 99;
    recConstant = false;
    recSelective = true;
    categoryName = 'Nhóm 3: Chi tiết nhân vật cốt lõi';
    reason = 'Được nhận định là Chi tiết nhân vật cốt lõi (Nhóm 3). Đặt sau định nghĩa nhân vật (After Character, Depth 2, Order 99) dưới dạng kích hoạt bằng từ khóa (Selective) để bảo toàn bối cảnh hoạt động.';
  }

  return {
    position: recPosition,
    scan_depth: recScanDepth,
    order: recOrder,
    prevent_recursion: recPreventRecursion,
    non_recursable: recNonRecursable,
    delay_until_recursion: recDelayUntilRecursion,
    ignore_budget: recIgnoreBudget,
    constant: recConstant,
    selective: recSelective,
    reason,
    categoryName
  };
}
