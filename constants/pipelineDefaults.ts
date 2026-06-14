// AUTO-GENERATED từ "Các bước hướng dẫn AI.txt" + "Quản lý Prompt AI.txt".
// Nguồn SỰ THẬT DUY NHẤT cho 5 bước pipeline + 5 prompt mẫu (thay 2 bản 4-bước lệch nhau cũ).
import { WorldbuildingStep, AIPromptBlock } from '../types';

// Tăng số này mỗi khi đổi bộ mặc định → App.tsx tự migrate cấu hình cũ.
export const PIPELINE_VERSION = 2;

export const DEFAULT_STEPS: WorldbuildingStep[] = [
  { id: 'step_1', enabled: true, name: `Bước 1: Thế Giới Quan & Thiết lập <user> (META)`, prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Thu thập toàn diện -> Lọc rác nghiêm ngặt -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét toàn bộ nội dung từ link Wiki được cung cấp. Trích xuất và tạo ra ĐÚNG 2 ENTRY nền tảng: THẾ GIỚI QUAN và META.

[QUY TẮC TRÌNH BÀY (LỆNH TUYỆT ĐỐI - CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Tuyệt đối không viết các đoạn văn dài dính liền nhau. Bắt buộc chia nhỏ ý, sử dụng triệt để gạch đầu dòng (-, +).
2. TỐI ƯU ĐỌC HIỂU: Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi. Bắt buộc **In đậm** các danh từ riêng, khái niệm, thời đại.
3. BỌC THẺ DỮ LIỆU: Nội dung xuất ra phải nằm trọn vẹn bên trong các thẻ HTML-like được quy định sẵn. Không để text trôi nổi bên ngoài.

[YÊU CẦU CHI TIẾT CHO TỪNG ENTRY]:

1. ENTRY [THẾ GIỚI QUAN]:
- NỘI DUNG: Phác thảo toàn cảnh vũ trụ, bối cảnh thời đại, khái niệm cốt lõi và bầu không khí chung của thế giới.
- BỘ LỌC RÁC: Cấm tuyệt đối liệt kê Nhân vật, Hệ thống sức mạnh, Khu vực hay Vật phẩm vào phần này.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Worldview>
- **Khái niệm vũ trụ:** (Điền nội dung ngắn gọn)
- **Bối cảnh thời đại:** (Điền nội dung ngắn gọn)
- **Luật lệ tự nhiên cốt lõi:** (Điền nội dung ngắn gọn)
</Worldview>

2. ENTRY [META_SETUP]:
- NỘI DUNG: Thiết lập quy tắc tồn tại song song giữa biến số \`<user>\` và Nhân vật chính (Main gốc) của thế giới này.
- ĐỊNH NGHĨA BIẾN SỐ: Khẳng định rõ \`<user>\` là một thực thể vô định, một biến số trống không có nhân dạng hay định nghĩa cố định (có thể là bất kỳ ai). Cấm AI tự ý phác họa ngoại hình hay tính cách cho \`<user>\`.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Meta>
- **Quy tắc tồn tại:** (Điền nội dung ngắn gọn)
- **Định nghĩa <user>:** (Điền nội dung ngắn gọn)
</Meta>` },
  { id: 'step_2', enabled: true, name: `Bước 2: Hệ Thống, Cơ Chế & Quy Tắc`, prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu (Deep Scan) -> Lọc rác tuyệt đối -> Phân loại và Bọc thẻ chuẩn xác.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chuyên sâu về [HỆ THỐNG] (Sức mạnh, Ma thuật, Công nghệ, Kinh tế...), [CƠ CHẾ] (Cách thế giới vận hành), và [QUY TẮC] (Định luật, Quy định, Luật lệ).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch. 
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Hệ thống/Cơ chế/Quy tắc có thể tồn tại trong Lore. Nếu đạt giới hạn text, tự động dừng ở cuối một thẻ và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên hệ thống, tên cảnh giới, cấp độ, hoặc thuật ngữ quan trọng.
3. BỘ LỌC RÁC: CẤM TUYỆT ĐỐI đưa bất kỳ yếu tố nào về Nhân vật, Khu vực, Vật phẩm, hay Cốt truyện vào đây.
4. BỌC THẺ DỮ LIỆU: Phân loại rạch ròi bằng 3 thẻ <System>, <Mechanic>, <Rule>. Không gộp chung.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi mục tìm thấy)]:

1. Đối với dữ liệu Hệ thống (Sức mạnh, Kinh tế, Giai cấp):
<System>
**Tên Hệ Thống:** (Điền tên)
- **Phân loại:** (Sức mạnh / Ma thuật / Kinh tế / Chính trị...)
- **Bản chất cốt lõi:** (Giải thích cực kỳ ngắn gọn)
- **Cấu trúc / Cảnh giới / Cấp độ:**
  + **[Tên Cấp 1]:** Đặc điểm cốt lõi.
  + **[Tên Cấp 2]:** Đặc điểm cốt lõi.
</System>

2. Đối với dữ liệu Cơ chế (Cách một hiện tượng/vật chất vận hành):
<Mechanic>
**Tên Cơ Chế:** (Điền tên)
- **Phạm vi tác động:** (Áp dụng lên ai/cái gì)
- **Cách thức hoạt động:**
  + Bước 1 / Điều kiện kích hoạt: (Mô tả ngắn gọn)
  + Bước 2 / Hiệu ứng tạo ra: (Mô tả ngắn gọn)
</Mechanic>

3. Đối với dữ liệu Quy tắc (Định luật tự nhiên, Luật lệ xã hội, Lời nguyền):
<Rule>
**Tên Quy Tắc:** (Điền tên)
- **Tính chất:** (Tuyệt đối / Có thể phá vỡ / Ràng buộc pháp lý...)
- **Nội dung quy tắc:** (Ghi rõ quy định ngắn gọn)
- **Hệ quả vi phạm:** (Điều gì xảy ra nếu phá luật)
</Rule>` },
  { id: 'step_3', enabled: true, name: `Bước 3: Toàn bộ Nhân Vật`, prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét toàn diện nhân vật -> Ép ranh giới dữ liệu -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về TOÀN BỘ [NHÂN VẬT] (Bao gồm: Nhân vật chính, Phụ, Phản diện, và cả Quần chúng có tên).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Nhân vật có mặt trong Wiki. Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi của nhân vật.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên nhân vật, danh hiệu, chủng tộc, tên kỹ năng.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI đưa các giải thích dài dòng về Hệ thống, Cơ chế, Khu vực, hay Cốt truyện vào đây.
   + Đối với sức mạnh/năng lực: CHỈ LIỆT KÊ TÊN và biểu hiện bên ngoài cực kỳ ngắn gọn. Không giải thích nguyên lý hoạt động của kỹ năng (Nguyên lý thuộc về thẻ <Mechanic>).
4. BỌC THẺ DỮ LIỆU: Mỗi nhân vật phải nằm trong một thẻ <Character> riêng biệt.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi nhân vật tìm thấy)]:

<Character>
**Tên Nhân Vật:** (Điền tên đầy đủ)
- **Bí danh / Danh hiệu:** (Điền nếu có)
- **Chủng tộc / Thế lực:** (Điền ngắn gọn)
- **Thân thế / Vị trí:** (Vai trò trong thế giới: Bang chủ, Học sinh, Thần minh...)
- **Đặc điểm cốt lõi:** (Tóm tắt tính cách hoặc đặc trưng nổi bật nhất trong 1-2 dòng)
- **Năng lực / Sức mạnh chính:** 
  + **[Tên Kỹ năng 1]:** (Mô tả hiệu ứng bề ngoài siêu ngắn gọn, ví dụ: "Bắn ra lửa đen").
  + **[Tên Kỹ năng 2]:** (Mô tả siêu ngắn gọn).
- **Mối quan hệ cốt lõi:** (Ví dụ: Kẻ thù của X, Đồng minh của Y)
</Character>` },
  { id: 'step_4', enabled: true, name: `Bước 4: Khu Vực & Địa Danh`, prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét không gian đa chiều -> Ràng buộc địa lý -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về [KHU VỰC] (Bao gồm: Đa vũ trụ, Chiều không gian, Hành tinh, Lục địa, Quốc gia, Thành phố, Kiến trúc, Tòa nhà...).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Quét từ quy mô vĩ mô (Macro) xuống vi mô (Micro).
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Khu vực có trong Wiki. Nếu đạt giới hạn text, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, tập trung miêu tả không gian.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên địa danh, quy mô, và các đặc trưng môi trường.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI trộn lẫn thông tin về Nhân vật cư trú, Hệ thống vận hành, hay Cốt truyện vào đây. 
   + Chỉ miêu tả thuần túy về Không gian, Địa hình, Khí hậu, và Kiến trúc.
4. BỌC THẺ DỮ LIỆU: Mỗi địa điểm phải nằm trọn vẹn trong một thẻ <Location>.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi địa điểm tìm thấy)]:

<Location>
**Tên Khu Vực:** (Điền tên địa danh)
- **Quy mô / Loại hình:** (Đa vũ trụ / Lục địa / Thành phố / Tòa nhà / Căn phòng...)
- **Đặc điểm môi trường / Địa lý:** (Mô tả khí hậu, địa hình, cảnh quan bề ngoài cực kỳ ngắn gọn)
- **Đặc trưng kiến trúc / Không gian:** (Mô tả cấu trúc vật lý hoặc đặc tính không gian đặc biệt)
- **Phân khu trực thuộc (Nếu có):** 
  + **[Tên khu vực nhỏ hơn 1]:** Chức năng chính.
  + **[Tên khu vực nhỏ hơn 2]:** Chức năng chính.
</Location>` },
  { id: 'step_5', enabled: true, name: `Bước 5: Dòng Thời Gian (Lịch sử)`, prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu tuyến tính -> Thiết lập Cảnh báo Biến số -> Trình bày chuẩn hóa đa phân đoạn (Multi-batch).

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất toàn bộ các mốc sự kiện trong [DÒNG THỜI GIAN] (Timeline / Lịch sử / Các sự kiện cốt lõi) theo đúng trình tự thời gian.

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi mốc sự kiện lịch sử có trong Wiki (từ khởi nguyên vũ trụ đến hiện tại). Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Tóm tắt mỗi sự kiện tối đa 2-3 dòng, cực kỳ súc tích, đi thẳng vào diễn biến.
2. NHẤN MẠNH: Bắt buộc **In đậm** mốc thời gian (Năm/Kỷ nguyên) và Tên sự kiện.
3. BỘ LỌC RANH GIỚI: CHỈ liệt kê diễn biến sự kiện. CẤM giải thích lại năng lực, cơ chế hay thân thế nhân vật tại đây (để tránh lặp dữ liệu).
4. BỌC THẺ DỮ LIỆU: Bọc toàn bộ trong thẻ <Timeline>, mỗi sự kiện chi tiết bọc thêm <Event>.

[ĐIỀU KIỆN KÍCH HOẠT ĐẶC BIỆT (HIỆU ỨNG CÁNH BƯỚM)]:
- LỆNH TUYỆT ĐỐI TỚI AI: Bắt buộc phải in nguyên văn đoạn [CẢNH BÁO HỆ THỐNG] dưới đây vào NGAY ĐẦU thẻ <Timeline> của Batch đầu tiên. AI phải hiểu rõ cốt truyện gốc sẽ bị hủy bỏ hoàn toàn ngay khi \`<user>\` xuất hiện.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC]:

<Timeline>
[CẢNH BÁO HỆ THỐNG - HIỆU ỨNG CÁNH BƯỚM]: Dòng thời gian gốc dưới đây CHỈ MANG TÍNH CHẤT THAM KHẢO. Khi biến số \`<user>\` chính thức giáng lâm và có bất kỳ hành động tương tác nào, Timeline gốc này sẽ ngay lập tức bị phá vỡ. Mọi sự kiện tương lai sẽ rẽ nhánh, bóp méo và thay đổi hoàn toàn dựa trên quỹ đạo hành động của \`<user>\`, vô hiệu hóa định mệnh đã được sắp đặt sẵn của thế giới này.

- **[Mốc Thời Gian 1] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

- **[Mốc Thời Gian 2] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

(Tiếp tục liệt kê cho đến khi hết dữ liệu...)
</Timeline>` },
];

export const DEFAULT_PROMPTS: AIPromptBlock[] = [
  { id: 'prompt_1', title: `PROMPT 1: THẾ GIỚI QUAN & META`, content: `[LUỒNG XỬ LÝ DỮ LIỆU]: Thu thập toàn diện -> Lọc rác nghiêm ngặt -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét toàn bộ nội dung từ link Wiki được cung cấp. Trích xuất và tạo ra ĐÚNG 2 ENTRY nền tảng: THẾ GIỚI QUAN và META.

[QUY TẮC TRÌNH BÀY (LỆNH TUYỆT ĐỐI - CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Tuyệt đối không viết các đoạn văn dài dính liền nhau. Bắt buộc chia nhỏ ý, sử dụng triệt để gạch đầu dòng (-, +).
2. TỐI ƯU ĐỌC HIỂU: Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi. Bắt buộc **In đậm** các danh từ riêng, khái niệm, thời đại.
3. BỌC THẺ DỮ LIỆU: Nội dung xuất ra phải nằm trọn vẹn bên trong các thẻ HTML-like được quy định sẵn. Không để text trôi nổi bên ngoài.

[YÊU CẦU CHI TIẾT CHO TỪNG ENTRY]:

1. ENTRY [THẾ GIỚI QUAN]:
- NỘI DUNG: Phác thảo toàn cảnh vũ trụ, bối cảnh thời đại, khái niệm cốt lõi và bầu không khí chung của thế giới.
- BỘ LỌC RÁC: Cấm tuyệt đối liệt kê Nhân vật, Hệ thống sức mạnh, Khu vực hay Vật phẩm vào phần này.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Worldview>
- **Khái niệm vũ trụ:** (Điền nội dung ngắn gọn)
- **Bối cảnh thời đại:** (Điền nội dung ngắn gọn)
- **Luật lệ tự nhiên cốt lõi:** (Điền nội dung ngắn gọn)
</Worldview>

2. ENTRY [META_SETUP]:
- NỘI DUNG: Thiết lập quy tắc tồn tại song song giữa biến số \`<user>\` và Nhân vật chính (Main gốc) của thế giới này.
- ĐỊNH NGHĨA BIẾN SỐ: Khẳng định rõ \`<user>\` là một thực thể vô định, một biến số trống không có nhân dạng hay định nghĩa cố định (có thể là bất kỳ ai). Cấm AI tự ý phác họa ngoại hình hay tính cách cho \`<user>\`.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Meta>
- **Quy tắc tồn tại:** (Điền nội dung ngắn gọn)
- **Định nghĩa <user>:** (Điền nội dung ngắn gọn)
</Meta>` },
  { id: 'prompt_2', title: `PROMPT 2: HỆ THỐNG / CƠ CHẾ / QUY TẮC`, content: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu (Deep Scan) -> Lọc rác tuyệt đối -> Phân loại và Bọc thẻ chuẩn xác.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chuyên sâu về [HỆ THỐNG] (Sức mạnh, Ma thuật, Công nghệ, Kinh tế...), [CƠ CHẾ] (Cách thế giới vận hành), và [QUY TẮC] (Định luật, Quy định, Luật lệ).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch. 
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Hệ thống/Cơ chế/Quy tắc có thể tồn tại trong Lore. Nếu đạt giới hạn text, tự động dừng ở cuối một thẻ và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên hệ thống, tên cảnh giới, cấp độ, hoặc thuật ngữ quan trọng.
3. BỘ LỌC RÁC: CẤM TUYỆT ĐỐI đưa bất kỳ yếu tố nào về Nhân vật, Khu vực, Vật phẩm, hay Cốt truyện vào đây.
4. BỌC THẺ DỮ LIỆU: Phân loại rạch ròi bằng 3 thẻ <System>, <Mechanic>, <Rule>. Không gộp chung.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi mục tìm thấy)]:

1. Đối với dữ liệu Hệ thống (Sức mạnh, Kinh tế, Giai cấp):
<System>
**Tên Hệ Thống:** (Điền tên)
- **Phân loại:** (Sức mạnh / Ma thuật / Kinh tế / Chính trị...)
- **Bản chất cốt lõi:** (Giải thích cực kỳ ngắn gọn)
- **Cấu trúc / Cảnh giới / Cấp độ:**
  + **[Tên Cấp 1]:** Đặc điểm cốt lõi.
  + **[Tên Cấp 2]:** Đặc điểm cốt lõi.
</System>

2. Đối với dữ liệu Cơ chế (Cách một hiện tượng/vật chất vận hành):
<Mechanic>
**Tên Cơ Chế:** (Điền tên)
- **Phạm vi tác động:** (Áp dụng lên ai/cái gì)
- **Cách thức hoạt động:**
  + Bước 1 / Điều kiện kích hoạt: (Mô tả ngắn gọn)
  + Bước 2 / Hiệu ứng tạo ra: (Mô tả ngắn gọn)
</Mechanic>

3. Đối với dữ liệu Quy tắc (Định luật tự nhiên, Luật lệ xã hội, Lời nguyền):
<Rule>
**Tên Quy Tắc:** (Điền tên)
- **Tính chất:** (Tuyệt đối / Có thể phá vỡ / Ràng buộc pháp lý...)
- **Nội dung quy tắc:** (Ghi rõ quy định ngắn gọn)
- **Hệ quả vi phạm:** (Điều gì xảy ra nếu phá luật)
</Rule>` },
  { id: 'prompt_3', title: `PROMPT 3: NHÂN VẬT`, content: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét toàn diện nhân vật -> Ép ranh giới dữ liệu -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về TOÀN BỘ [NHÂN VẬT] (Bao gồm: Nhân vật chính, Phụ, Phản diện, và cả Quần chúng có tên).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Nhân vật có mặt trong Wiki. Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi của nhân vật.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên nhân vật, danh hiệu, chủng tộc, tên kỹ năng.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI đưa các giải thích dài dòng về Hệ thống, Cơ chế, Khu vực, hay Cốt truyện vào đây.
   + Đối với sức mạnh/năng lực: CHỈ LIỆT KÊ TÊN và biểu hiện bên ngoài cực kỳ ngắn gọn. Không giải thích nguyên lý hoạt động của kỹ năng (Nguyên lý thuộc về thẻ <Mechanic>).
4. BỌC THẺ DỮ LIỆU: Mỗi nhân vật phải nằm trong một thẻ <Character> riêng biệt.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi nhân vật tìm thấy)]:

<Character>
**Tên Nhân Vật:** (Điền tên đầy đủ)
- **Bí danh / Danh hiệu:** (Điền nếu có)
- **Chủng tộc / Thế lực:** (Điền ngắn gọn)
- **Thân thế / Vị trí:** (Vai trò trong thế giới: Bang chủ, Học sinh, Thần minh...)
- **Đặc điểm cốt lõi:** (Tóm tắt tính cách hoặc đặc trưng nổi bật nhất trong 1-2 dòng)
- **Năng lực / Sức mạnh chính:** 
  + **[Tên Kỹ năng 1]:** (Mô tả hiệu ứng bề ngoài siêu ngắn gọn, ví dụ: "Bắn ra lửa đen").
  + **[Tên Kỹ năng 2]:** (Mô tả siêu ngắn gọn).
- **Mối quan hệ cốt lõi:** (Ví dụ: Kẻ thù của X, Đồng minh của Y)
</Character>` },
  { id: 'prompt_4', title: `PROMPT 4: KHU VỰC`, content: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét không gian đa chiều -> Ràng buộc địa lý -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về [KHU VỰC] (Bao gồm: Đa vũ trụ, Chiều không gian, Hành tinh, Lục địa, Quốc gia, Thành phố, Kiến trúc, Tòa nhà...).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Quét từ quy mô vĩ mô (Macro) xuống vi mô (Micro).
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Khu vực có trong Wiki. Nếu đạt giới hạn text, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, tập trung miêu tả không gian.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên địa danh, quy mô, và các đặc trưng môi trường.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI trộn lẫn thông tin về Nhân vật cư trú, Hệ thống vận hành, hay Cốt truyện vào đây. 
   + Chỉ miêu tả thuần túy về Không gian, Địa hình, Khí hậu, và Kiến trúc.
4. BỌC THẺ DỮ LIỆU: Mỗi địa điểm phải nằm trọn vẹn trong một thẻ <Location>.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi địa điểm tìm thấy)]:

<Location>
**Tên Khu Vực:** (Điền tên địa danh)
- **Quy mô / Loại hình:** (Đa vũ trụ / Lục địa / Thành phố / Tòa nhà / Căn phòng...)
- **Đặc điểm môi trường / Địa lý:** (Mô tả khí hậu, địa hình, cảnh quan bề ngoài cực kỳ ngắn gọn)
- **Đặc trưng kiến trúc / Không gian:** (Mô tả cấu trúc vật lý hoặc đặc tính không gian đặc biệt)
- **Phân khu trực thuộc (Nếu có):** 
  + **[Tên khu vực nhỏ hơn 1]:** Chức năng chính.
  + **[Tên khu vực nhỏ hơn 2]:** Chức năng chính.
</Location>` },
  { id: 'prompt_5', title: `PROMPT 5: DÒNG THỜI GIAN`, content: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu tuyến tính -> Thiết lập Cảnh báo Biến số -> Trình bày chuẩn hóa đa phân đoạn (Multi-batch).

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất toàn bộ các mốc sự kiện trong [DÒNG THỜI GIAN] (Timeline / Lịch sử / Các sự kiện cốt lõi) theo đúng trình tự thời gian.

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi mốc sự kiện lịch sử có trong Wiki (từ khởi nguyên vũ trụ đến hiện tại). Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Tóm tắt mỗi sự kiện tối đa 2-3 dòng, cực kỳ súc tích, đi thẳng vào diễn biến.
2. NHẤN MẠNH: Bắt buộc **In đậm** mốc thời gian (Năm/Kỷ nguyên) và Tên sự kiện.
3. BỘ LỌC RANH GIỚI: CHỈ liệt kê diễn biến sự kiện. CẤM giải thích lại năng lực, cơ chế hay thân thế nhân vật tại đây (để tránh lặp dữ liệu).
4. BỌC THẺ DỮ LIỆU: Bọc toàn bộ trong thẻ <Timeline>, mỗi sự kiện chi tiết bọc thêm <Event>.

[ĐIỀU KIỆN KÍCH HOẠT ĐẶC BIỆT (HIỆU ỨNG CÁNH BƯỚM)]:
- LỆNH TUYỆT ĐỐI TỚI AI: Bắt buộc phải in nguyên văn đoạn [CẢNH BÁO HỆ THỐNG] dưới đây vào NGAY ĐẦU thẻ <Timeline> của Batch đầu tiên. AI phải hiểu rõ cốt truyện gốc sẽ bị hủy bỏ hoàn toàn ngay khi \`<user>\` xuất hiện.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC]:

<Timeline>
[CẢNH BÁO HỆ THỐNG - HIỆU ỨNG CÁNH BƯỚM]: Dòng thời gian gốc dưới đây CHỈ MANG TÍNH CHẤT THAM KHẢO. Khi biến số \`<user>\` chính thức giáng lâm và có bất kỳ hành động tương tác nào, Timeline gốc này sẽ ngay lập tức bị phá vỡ. Mọi sự kiện tương lai sẽ rẽ nhánh, bóp méo và thay đổi hoàn toàn dựa trên quỹ đạo hành động của \`<user>\`, vô hiệu hóa định mệnh đã được sắp đặt sẵn của thế giới này.

- **[Mốc Thời Gian 1] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

- **[Mốc Thời Gian 2] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

(Tiếp tục liệt kê cho đến khi hết dữ liệu...)
</Timeline>` },
];
