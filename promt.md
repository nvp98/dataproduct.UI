## Thay đổi API: Tìm kiếm phiếu theo quyền user

  ### API cũ (vẫn còn, chưa xóa)
  POST /api/phieus/search
  Body:
  {
    "nguoiTaoId": 5,       // lọc phiếu user là người tạo/xử lý       
    "nguoiDuyetId": 5,     // lọc phiếu user là người phê duyệt       
    "maBm": "HRC2_BOF",
    "maBmList": ["HRC2_BOF", "HRC2_LF"],
    "tuNgay": "2026-04-01",
    "denNgay": "2026-04-10",
    "ca": 1,
    "scope": 2,
    "mayDuc": 3,
    "tinhTrang": 1,
    "searchText": "...",
    "page": 1,
    "pageSize": 10
  }

  ### API mới (thêm mới)
  POST /api/phieus/search-by-user
  Body: GIỐNG HỆT cũ nhưng thay "nguoiTaoId" + "nguoiDuyetId" bằng    
  "userId":
  {
    "userId": 5,            // ← THAY ĐỔI DUY NHẤT
    "maBmList": ["HRC2_BOF", "HRC2_LF"],
    "tuNgay": "2026-04-01",
    "denNgay": "2026-04-10",
    "ca": 1,
    "scope": 2,
    "mayDuc": 3,
    "tinhTrang": 1,
    "searchText": "...",
    "page": 1,
    "pageSize": 10
  }

  ### Behavior của API mới
  Backend tự tra bảng BM_QuyenXL để xác định quyền của userId, rồi lọc
   phiếu:
  - Quyền XULY (1) hoặc XULY_VA_PHEDUYET (4) trên MaBm X → hiện phiếu 
  MaBm X mà user là người xử lý
  - Quyền PHEDUYET (2) hoặc XULY_VA_PHEDUYET (4) trên MaBm X → hiện   
  phiếu MaBm X mà user là người duyệt
  - Quyền XEM (5) trên MaBm X → hiện tất cả phiếu của MaBm X (không   
  lọc theo user)
  - Không truyền userId → trả hết (không lọc quyền)

  ### Response (không đổi)
  {
    "data": [
      {
        "idphieu": "guid",
        "soPhieu": "...",
        "maBm": "HRC2_BOF",
        "ngaySX": "2026-04-01",
        "ca": 1,
        "scope": 2,
        "mayDuc": 3,
        "tinhTrang": 1,
        "nguoiTao": 5,
        "pheDuyet": [ { "capDuyet": 1, "nguoiDuyetId": 5, "tinhTrang":
   1 } ]
      }
    ],
    "totalRecords": 100,
    "page": 1,
    "pageSize": 10
  }

  ---

  ## Yêu cầu FE

  Hãy tìm tất cả chỗ trong codebase FE đang gọi POST
  /api/phieus/search với tham số
  "nguoiTaoId" hoặc "nguoiDuyetId", rồi:

  1. Chuyển sang gọi POST /api/phieus/search-by-user
  2. Gộp "nguoiTaoId" và "nguoiDuyetId" thành "userId" (lấy từ thông  
  tin user đang đăng nhập)
  3. Xóa logic FE đang tự phân biệt "việc tôi tạo" / "việc đến tôi"   
  bằng 2 param riêng
     — backend đã tự xử lý dựa trên quyền

  Giữ nguyên các tham số khác (maBmList, tuNgay, denNgay, ca, scope,  
  ...).
  Không thay đổi cách render response vì cấu trúc trả về không đổi.