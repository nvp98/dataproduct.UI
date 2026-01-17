# Data Product - Tài liệu kiến trúc hệ thống

## 🎯 Core Features & Implementation

### 1. **Dynamic Form Rendering**

Các trang form (BienBanPhoiNong, TieuHaoNauLuyen, etc.) được render động dựa trên config JSON:

**Example: BienBanPhoiNong.tsx**

```typescript
import config from "@/utils/BM_config/CTD_BB_Phoinong.json";

const BienBanPhoiNong = () => {
  // Render header fields
  config.headerFields.map((field) => <CustomFormItem field={field} />);

  // Render table
  config.layout.map((section) => {
    if (section.sectionType === "table") {
      return <CustomFormTable columns={section.columns} />;
    }
  });

  // Render signatures
  config.signatures.map((sig) => <CustomChonNguoiKy field={sig} />);
};
```

**Benefits:**

- ✅ Không cần hard-code form structure
- ✅ Dễ dàng thêm/sửa field bằng cách edit JSON
- ✅ Reusable components cho nhiều form khác nhau
- ✅ Centralized configuration

---

### 2. **Inline Table Editing**

CustomFormTable hỗ trợ chỉnh sửa trực tiếp trên cell:

**Features:**

- Click vào cell → Input field xuất hiện
- Auto-save on blur/Enter
- Readonly fields (từ API) có background màu vàng
- Validation inline
- Summary row tự động tính tổng

**Implementation:**

```typescript
<CustomFormTable
  columns={columns}
  initialData={tableData}
  onDataChange={(data) => {
    setTableData(data);
    // Auto-sync with form state
  }}
  editable={true}
  readonlyFields={["me", "mac", "kichThuoc"]} // From API
/>
```

---

### 3. **Phôi Transfer System** (Chuyển phôi)

Workflow chuyển phôi từ NM.HRC1 → NM.CTD:

```
┌─────────────────────────────────────────────────┐
│         Bảng Phôi (BKMIS Data)                  │
│  [Chọn dòng] → Chuyển hết / Chuyển một phần     │
└─────────────────────────────────────────────────┘
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
  Chuyển hết           Chuyển một phần
  (ST_LoaiI)           (Modal nhập ST từng loại)
         ↓                     ↓
         └──────────┬──────────┘
                    ↓
      ┌─────────────────────────────┐
      │ 1. POST to CtdPhoiNongApi   │
      │ 2. Update BKPhoiThep.ST_Da  │
      │ 3. Update local tableData   │
      │ 4. Reload chuyenData        │
      └─────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│      Danh sách phôi đã chuyển (CTD Data)        │
│  Filter: Ngày/Ca (chỉ 3 ca: hiện tại + 2 liền) │
│  Actions: Xác nhận CTD/QLCL, Thu hồi, Chốt     │
└─────────────────────────────────────────────────┘
```

**Logic giới hạn chọn ca:**

```typescript
const getValidNextShifts = () => {
  const currentDate = dayjs(ngaySX);
  const currentShift = Number(ca);

  if (currentShift === 1) {
    // Ca ngày → cho phép: Ca ngày 14, Ca đêm 14, Ca ngày 15
    return [
      { date: currentDate, shift: 1 },
      { date: currentDate, shift: 2 },
      { date: currentDate.add(1, "day"), shift: 1 },
    ];
  } else {
    // Ca đêm → cho phép: Ca đêm 14, Ca ngày 15, Ca đêm 15
    return [
      { date: currentDate, shift: 2 },
      { date: currentDate.add(1, "day"), shift: 1 },
      { date: currentDate.add(1, "day"), shift: 2 },
    ];
  }
};
```

---

### 4. **Approval Workflow** (Luồng phê duyệt)

```
Người tạo (NM.HRC1)
   ↓
Gửi trình ký
   ↓
┌────────────────────────────────────┐
│  Luồng phê duyệt (từ config):     │
│  ├─ Cấp 1: P.QLCL (nguoiKy_QLCL)  │
│  └─ Cấp 2: NM.CTD (nguoiKy_CTD)   │
└────────────────────────────────────┘
   ↓
Việc đến tôi (P.QLCL)
   ↓
[Xác nhận] → tinhTrangQLCL = 1
   ↓
Việc đến tôi (NM.CTD)
   ↓
[Xác nhận] → tinhTrangCTD = 1
   ↓
P.KH [Chốt phiếu] → status = 5 (Locked)
```

**Build approval payload:**

```typescript
const signatures = config.signatures.filter((s) => s.capduyet > 0);
const luongPheduyet = signatures.map((sig) => ({
  capduyet: sig.capduyet,
  nguoiKy: formValues[sig.key],
  maphongban: sig.maphongBan,
}));

payload.luongPheduyet = luongPheduyet;
```

---

### 5. **Data Synchronization** (BK MIS ↔ CTD)

**Khi fetch dữ liệu BKMIS:**

```typescript
const fetchTableData = async (params) => {
  const apiData = await phoiGiaoNhanApi.getBKPhoiThep(params);

  // Map API → Table format
  const mapped = mapApiToTable(apiData);

  // Merge với dữ liệu hiện tại (giữ user edits)
  const merged = tableData.map((existingRow) => {
    const apiRow = mapped.find(
      (r) => r.me === existingRow.me && r.mac === existingRow.mac
    );

    if (apiRow) {
      return {
        ...existingRow, // Keep user edits
        ...apiRow, // Update readonly fields
        // Preserve editable fields:
        ghiChu: existingRow.ghiChu,
      };
    }
    return existingRow;
  });

  setTableData(merged);
};
```

**Khi chuyển phôi:**

```typescript
// 1. Post to CTD
await CtdPhoiNongApi.postBulkTransfers(selectedRows);

// 2. Update BK MIS
const stUpdatePayload = selectedRows.map((r) => ({
  id: r.idBkPhoiThep,
  sT_DaChuyen: r.tongSt,
}));
await phoiGiaoNhanApi.stDaChuyenBulk(stUpdatePayload);

// 3. Update local state
setTableData((prev) =>
  prev.map((row) =>
    selectedKeys.includes(row.key)
      ? { ...row, stChuaChuyen: 0, tinhTrang: 1 }
      : row
  )
);
```

---

### 6. **Export Functions** (Excel/PDF)

```typescript
const handleExportExcel = async () => {
  const params = {
    NgaySX: filterNgay.format("YYYY-MM-DD"),
    Ca: Number(filterCa),
    Xuong: filterXuong,
  };

  const response = await CtdPhoiNongApi.exportExcel(params);

  const blob = new Blob([response], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `BienBan_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
```

---

### 7. **Global Loading & Notification**

**GlobalLoading Component:**

```typescript
const GlobalLoading = () => {
  const loading = useSelector((state: RootState) => state.loading.loading);

  if (!loading) return null;

  return (
    <div className="global-loading-overlay">
      <Spin size="large" />
    </div>
  );
};
```

**Usage:**

```typescript
import { setLoading } from "@/store/loadingSlice";

const fetchData = async () => {
  dispatch(setLoading(true));
  try {
    await api.call();
  } finally {
    dispatch(setLoading(false));
  }
};
```

**NotificationListener:**

```typescript
const NotificationListener = () => {
  const notifications = useSelector(
    (state: RootState) => state.notification.notifications
  );

  useEffect(() => {
    notifications.forEach((notif) => {
      message[notif.type](notif.message);
    });
  }, [notifications]);

  return null;
};
```

---

## 🛠️ Development Guidelines

### Adding a New Form

1. **Create config file:**

   ```bash
   src/utils/BM_config/NEW_FORM.json
   ```

2. **Define config structure:**

   ```json
   {
     "code": "NEW_FORM_CODE",
     "title": "Form Title",
     "headerFields": [...],
     "layout": [...]
   }
   ```

3. **Create page component:**

   ```typescript
   import config from "@/utils/BM_config/NEW_FORM.json";

   const NewFormPage = () => {
     // Use config to render
   };
   ```

4. **Add route:**

   ```typescript
   {
     path: '/new-form',
     element: <RequireAuth><NewFormPage /></RequireAuth>
   }
   ```

5. **Add to sidebar menu:**
   ```typescript
   // components/SidebarMenu.tsx
   ```

---

### Code Style

- **TypeScript**: Sử dụng strict types
- **Components**: Functional components + hooks
- **State**: Redux cho global state, useState cho local
- **Naming**:
  - Components: PascalCase
  - Files: PascalCase cho components, camelCase cho utils
  - Variables: camelCase
  - Constants: UPPER_SNAKE_CASE

---

## 📦 Build & Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Environment Variables

```env
VITE_API_URL=https://api.example.com
```

---

## 🔐 Security

- **JWT Authentication**: Token stored in localStorage
- **Request Interceptor**: Auto-attach Bearer token
- **Response Interceptor**: Handle 401 → logout
- **Route Guards**: RequireAuth, RequireRole
- **XSS Protection**: Ant Design components auto-escape

---

## 📚 Key Libraries

| Library       | Purpose                 |
| ------------- | ----------------------- |
| React 18      | UI framework            |
| TypeScript    | Type safety             |
| Ant Design    | Component library       |
| Redux Toolkit | State management        |
| React Router  | Navigation              |
| Axios         | HTTP client             |
| Day.js        | Date manipulation       |
| Vite          | Build tool & dev server |
| TailwindCSS   | Utility-first CSS       |
| pdfmake       | PDF generation          |

---

## 📝 Notes

- Config files trong `BM_config/` là metadata cho form, không nên hard-code vào component
- Mọi API call nên đi qua service layer (không gọi axios trực tiếp trong component)
- Sử dụng custom hooks để reuse logic (ví dụ: `usePhieuSearchList`)
- Redux chỉ cho global state, local state dùng useState
- Component nên nhỏ, tập trung vào 1 nhiệm vụ (Single Responsibility)

---

## 🐛 Troubleshooting

### Issue: Form không hiển thị dữ liệu

- Kiểm tra config JSON có đúng cấu trúc không
- Kiểm tra API response format
- Check console log errors

### Issue: Table không editable

- Verify `editable={true}` prop
- Check `readonlyFields` array
- Kiểm tra column `dataIndex` có khớp với data keys

### Issue: Routing không hoạt động

- Kiểm tra route definition trong `routes.tsx`
- Verify guards (RequireAuth, RequireRole)
- Check token in localStorage

---

**Last Updated:** January 17, 2026  
**Maintainers:** Hòa Phát Dung Quất Development Team
