# Data Product - Hệ thống quản lý biểu mẫu sản xuất

## 📋 Giới thiệu

Hệ thống quản lý biểu mẫu sản xuất cho Hòa Phát Dung Quất, hỗ trợ quản lý và theo dõi các quy trình sản xuất thép qua các phân xưởng: NM.CTD, NM.HRC1, NM.HRC2, NM.NL, NMLG.

**Tech Stack:**

- React 18.3 + TypeScript
- Vite 7.0 (Build tool)
- Ant Design 5.26 (UI Framework)
- Redux Toolkit + Redux Persist (State Management)
- React Router 7.7 (Routing)
- Axios (HTTP Client)
- Day.js (Date handling)
- TailwindCSS (Utility CSS)

---

## 🏗️ Kiến trúc hệ thống

### 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Layouts    │      │
│  │ (Features)   │  │  (Reusable)  │  │  (Skeleton)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │    Hooks     │  │    Store     │      │
│  │ (Navigation) │  │  (Business)  │  │   (Redux)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │    Models    │  │    Utils     │      │
│  │   (APIs)     │  │  (TypeDefs)  │  │  (Helpers)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      CONFIGURATION LAYER                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           BM_config/*.json (Form Metadata)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Cấu trúc thư mục

```
dataproduct.client/
├── public/                          # Static assets
├── src/
│   ├── assets/                      # Images, fonts, icons
│   │   └── images/
│   │
│   ├── components/                  # Reusable UI Components
│   │   ├── CustomFormTable.tsx      # Dynamic table with inline editing
│   │   ├── CustomFormItem.tsx       # Form field wrapper
│   │   ├── DynamicForm.tsx          # Config-driven form generator
│   │   ├── GlobalLoading.tsx        # Global loading overlay
│   │   ├── NotificationListener.tsx # Toast notification handler
│   │   ├── SidebarMenu.tsx          # Navigation sidebar
│   │   ├── MainHeader.tsx           # App header
│   │   ├── MainFooter.tsx           # App footer
│   │   └── ...
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   └── usePhieuSearchList.ts    # Hook for phieu search & pagination
│   │
│   ├── layouts/                     # Layout components
│   │   ├── MainLayout.tsx           # Authenticated layout
│   │   └── PublicLayout.tsx         # Public layout (login, etc.)
│   │
│   ├── models/                      # TypeScript type definitions
│   │   ├── Phieu.ts                 # Form/Phieu models
│   │   ├── HeaderKeyModel.ts        # Header mapping models
│   │   └── ...
│   │
│   ├── pages/                       # Feature pages (route components)
│   │   ├── Home/
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── NMCTD/                   # Phân xưởng CTD
│   │   │   ├── BienBanPhoiNong/
│   │   │   └── BienBanPhoiNguoi/
│   │   ├── NM.HRC1/                 # Phân xưởng HRC1
│   │   │   ├── BienBanThepLong/
│   │   │   └── TieuHaoLoThoi/
│   │   ├── NM.HRC2/                 # Phân xưởng HRC2
│   │   │   ├── BienBanGiaoNhanPhoiTam/
│   │   │   ├── STD_NhapXuatTon/
│   │   │   └── Tieu Hao NauLuyen_*/
│   │   ├── NM.NL/                   # Phân xưởng NL
│   │   ├── KhoDuLieu/               # Data warehouse pages
│   │   ├── Reports/
│   │   ├── Settings/
│   │   └── ...
│   │
│   ├── routes/                      # Routing configuration
│   │   ├── AppRoutes.tsx            # Main router component
│   │   ├── routes.tsx               # Route definitions
│   │   ├── RequireAuth.tsx          # Authentication guard
│   │   └── RequireRole.tsx          # Role-based guard
│   │
│   ├── services/                    # API service layer
│   │   ├── ApiService.tsx           # Axios instance & interceptors
│   │   ├── PhieuApi.tsx             # Phieu CRUD operations
│   │   ├── BKPhoiThepApi.tsx        # BK Phoi Thep API
│   │   ├── CtdPhoiNongApi.tsx       # CTD Phoi Nong API
│   │   ├── UserApi.tsx              # User/Auth API
│   │   └── ...
│   │
│   ├── store/                       # Redux store
│   │   ├── index.ts                 # Store configuration
│   │   ├── authSlice.ts             # Authentication state
│   │   ├── loadingSlice.ts          # Global loading state
│   │   └── NotificationSlice.ts     # Notification state
│   │
│   ├── styles/                      # Global styles
│   │   └── readonly.css             # Readonly field styles
│   │
│   ├── utils/                       # Utilities & helpers
│   │   ├── BM_config/               # 📌 FORM CONFIGURATION FILES
│   │   │   ├── CTD_BB_Phoinong.json
│   │   │   ├── CTD_BB_Phoinguoi.json
│   │   │   ├── HRC1_BB_Theplong.json
│   │   │   ├── HRC2_BB_NauLuyen_LF.json
│   │   │   └── ...
│   │   ├── configs/                 # App configs
│   │   ├── constants/               # Constants
│   │   └── helpers/                 # Helper functions
│   │
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global CSS
│
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript config
├── tailwind.config.js               # TailwindCSS config
└── package.json                     # Dependencies
```

---

---

## 🔄 Luồng hoạt động của hệ thống

### 1. **Application Initialization Flow**

```
main.tsx
   ↓
App.tsx (with Redux Provider)
   ↓
├── GlobalLoading (subscribes to loadingSlice)
├── NotificationListener (subscribes to notificationSlice)
└── RouterWrapper (AppRoutes)
      ↓
   routes.tsx
      ↓
   MainLayout / PublicLayout
      ↓
   Page Components
```

**Chi tiết:**

1. **Entry Point** (`main.tsx`):

   - Khởi tạo React root
   - Wrap app với Redux Provider
   - Inject store vào component tree

2. **App Component** (`App.tsx`):

   - Mount các global components:
     - `GlobalLoading`: Hiển thị loading overlay khi `loadingSlice.loading === true`
     - `NotificationListener`: Lắng nghe notification events từ Redux
   - Render router wrapper

3. **Router** (`AppRoutes.tsx` + `routes.tsx`):
   - Define routes với nested layout
   - Apply route guards: `RequireAuth`, `RequireRole`
   - Lazy loading các page components

---

### 2. **Authentication Flow**

```
LoginPage
   ↓
UserApi.login(credentials)
   ↓
API Response: { token, user, userinfo }
   ↓
Store in:
├── localStorage.setItem('token')
├── localStorage.setItem('user')
└── localStorage.setItem('userinfo')
   ↓
dispatch(setUser(user))  → authSlice
   ↓
navigate('/') → Protected Routes
```

**Guards:**

- `RequireAuth`: Kiểm tra token, redirect → `/login` nếu chưa đăng nhập
- `RequireRole`: Kiểm tra quyền user, redirect → `/403` nếu không có quyền

---

### 3. **Form Configuration System (Config-Driven Architecture)**

Hệ thống sử dụng **metadata-driven approach** để render form động từ file JSON config.

#### 3.1. Config File Structure (`BM_config/*.json`)

```json
{
  "code": "CTD_BB_Phoinong", // Form code/identifier
  "prefix": "BBPN", // Số phiếu prefix
  "title": "BIÊN BẢN GIAO NHẬN PHÔI NÓNG",

  "headerInfo": {
    // Company info (hiển thị header)
    "company": "HÒA PHÁT DUNG QUẤT",
    "subCompany": "CÔNG TY CỔ PHẦN THÉP"
  },

  "isoInfo": {
    // ISO metadata
    "code": "BM.06/QT.05.11",
    "effectiveDate": "10/05/2025",
    "revision": "01"
  },

  "headerFields": [
    // Form input fields
    {
      "label": "Ca",
      "type": "select",
      "key": "ca",
      "required": true,
      "options": [
        { "label": "Ca Ngày", "value": 1 },
        { "label": "Ca Đêm", "value": 2 }
      ]
    },
    {
      "label": "Ngày",
      "type": "date",
      "key": "NgaySX",
      "required": true
    }
  ],

  "layout": [
    // Table/Section definitions
    {
      "sectionType": "table",
      "title": "",
      "key": "table1",
      "dataSource": {
        "type": "api", // API-driven data source
        "url": "BKPhoiThep",
        "params": { "kip": "@kip" }
      },
      "columns": [
        // Dynamic column definitions
        {
          "title": "Mẻ",
          "dataIndex": "me"
        },
        {
          "title": "Loại I",
          "children": [
            // Nested columns
            {
              "title": "Số thanh",
              "dataIndex": "ST_LoaiI"
            },
            {
              "title": "Khối lượng",
              "dataIndex": "KL_LoaiI"
            }
          ]
        }
      ]
    }
  ],

  "footerNotes": [
    // Footer notes
    "Ghi chú 1",
    "Ghi chú 2"
  ],

  "signatures": [
    // Approval workflow
    {
      "label": "NM.CTD",
      "type": "selectNguoiKy",
      "key": "nguoiKy_CTD",
      "maphongBan": "NM.CTD",
      "capduyet": 0, // Approval level
      "isChon": false,
      "required": true
    }
  ]
}
```

#### 3.2. Config Loading Flow

```
Page Component (e.g., BienBanPhoiNong.tsx)
   ↓
import config from '@/utils/BM_config/CTD_BB_Phoinong.json'
   ↓
Pass config to rendering logic
   ↓
├── Render headerFields → CustomFormItem
├── Render layout.table → CustomFormTable
│     ↓
│   Parse columns definition
│     ↓
│   Fetch data from API (if dataSource.type === 'api')
│     ↓
│   Render dynamic table
│
└── Render signatures → CustomChonNguoiKy
```

#### 3.3. Form Data Flow (Create/Edit Form)

**Khởi tạo form:**

```
TaoPhieuPhoiNong Component
   ↓
Load config: CTD_BB_Phoinong.json
   ↓
Initialize form state:
├── form = Form.useForm()
├── tableData = useState([])
├── chuyenData = useState([])
   ↓
If (idphieu exists) → fetchData(idphieu)
   ↓
PhieuApi.getById(idphieu)
   ↓
Response: { ngaySX, ca, jsonData: { table1, chuyenData } }
   ↓
form.setFieldsValue({ ngaySX, ca })
setTableData(jsonData.table1)
setChuyenData(jsonData.chuyenData)
```

**Fetch API data (BKMIS):**

```
useEffect(() => {
  if (ngaySX && ca) fetchTableData({ NgaySX, Ca })
}, [ngaySX, ca])
   ↓
phoiGiaoNhanApi.getBKPhoiThep(params)
   ↓
Map API response → Table rows
   ↓
Merge with existing tableData (preserve user edits)
   ↓
setTableData(mergedData)
```

**Submit flow:**

```
User clicks "Gửi trình ký"
   ↓
handleSubmit(formValues)
   ↓
Build payload:
{
  ...formValues,
  maBm: config.code,
  nguoiTaoId: userInfo.id,
  table1: tableData,           // Normalized data
  chuyenData: chuyenData,
  luongPheduyet: [             // Approval workflow
    { capduyet: 1, nguoiKy: ... },
    { capduyet: 2, nguoiKy: ... }
  ]
}
   ↓
if (idphieu) → PhieuApi.putData(idphieu, payload)
else → PhieuApi.postData(payload)
   ↓
Update status: PhieuApi.changeStatus(idphieu, { status: 1 })
   ↓
Show success message
```

---

### 4. **Data Table Component Flow** (`CustomFormTable.tsx`)

```
<CustomFormTable
  columns={enhancedColumns}      // Config-driven columns
  initialData={tableData}        // External data source
  onDataChange={setTableData}    // Callback on edit
  editable={true}                // Enable inline editing
  selectionEnabled={true}        // Enable row selection
  readonlyFields={['me', 'mac']} // Fields from API (readonly)
  loading={loading}
  summary={() => <SummaryRow />}
/>
```

**Internal Flow:**

1. **Column Rendering:**

   - Parse `columns` config
   - Detect `children` for nested headers
   - Apply `width`, `fixed`, `align` properties
   - Generate column render functions

2. **Cell Editing:**

   - Detect click on editable cell
   - Render `<Input />` inline
   - On blur/Enter → update row data
   - Call `onDataChange(updatedData)`

3. **Row Selection:**

   - If `selectionEnabled` → show checkbox column
   - Filter selectable rows with `isRowSelectable(row)`
   - Sync with parent via `selectedRowKeys` & `onSelectionChange`

4. **Readonly Fields:**

   - Fields in `readonlyFields` get yellow background
   - Cannot be edited even if `editable={true}`

5. **Summary Row:**
   - Custom summary function
   - Calculate totals (ST, KL, etc.)
   - Render at table footer

---

### 5. **API Service Layer**

#### 5.1. Base API Service (`ApiService.tsx`)

```typescript
const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor: Inject JWT token
apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response Interceptor: Handle 401 errors
apiService.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

#### 5.2. Domain-Specific API Services

**PhieuApi.tsx:**

```typescript
export const PhieuApi = {
  async searchPhieu(params: SearchPhieuParams) {
    return apiService.post("/api/Phieu/SearchPhieu", params);
  },

  async getById(id: number) {
    return apiService.get(`/api/Phieu/${id}`);
  },

  async postData(payload: any) {
    return apiService.post("/api/Phieu", payload);
  },

  async putData(id: number, payload: any) {
    return apiService.put(`/api/Phieu/${id}`, payload);
  },

  async changeStatus(id: number, status: number) {
    return apiService.put(`/api/Phieu/${id}/status`, { status });
  },
};
```

**BKPhoiThepApi.tsx:**

```typescript
export const phoiGiaoNhanApi = {
  async getBKPhoiThep(params: { NgaySX; Ca; LoaiPhoi }) {
    return apiService.post("/api/BKPhoiThep/GetBKPhoiThep", params);
  },

  async stDaChuyenBulk(payload: Array<{ id; sT_DaChuyen }>) {
    return apiService.put("/api/BKPhoiThep/UpdateSTDaChuyen", payload);
  },
};
```

**CtdPhoiNongApi.tsx:**

```typescript
export const CtdPhoiNongApi = {
  async searchCtdPhoiNong(params) {
    return apiService.post("/api/CtdPhoiNong/Search", params);
  },

  async updateStatus(payload: Array<{ id; tinhTrangCTD }>) {
    return apiService.put("/api/CtdPhoiNong/UpdateStatus", payload);
  },

  async exportExcel(params) {
    return apiService.post("/api/CtdPhoiNong/ExportExcel", params, {
      responseType: "blob",
    });
  },
};
```

---

### 6. **State Management (Redux)**

#### 6.1. Store Structure

```typescript
store/
├── index.ts              // configureStore
├── authSlice.ts          // { user, isAuthenticated }
├── loadingSlice.ts       // { loading: boolean }
└── NotificationSlice.ts  // { notifications: [] }
```

#### 6.2. authSlice

```typescript
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});
```

**Usage:**

```typescript
// In component
const user = useSelector((state: RootState) => state.auth.user);
const dispatch = useDispatch();

dispatch(setUser(userData));
```

---

### 7. **Custom Hooks**

#### 7.1. `usePhieuSearchList.ts`

Hook tái sử dụng cho tìm kiếm & phân trang phiếu:

```typescript
export const usePhieuSearchList = ({
  maBm, // Form code filter
  fixedFilters, // Always-applied filters
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const handleFilter = async (filters) => {
    setLoading(true);
    const params = {
      ...fixedFilters,
      ...filters,
      maBm,
      pageIndex: pagination.current,
      pageSize: pagination.pageSize,
    };

    const res = await PhieuApi.searchPhieu(params);
    setData(res.data);
    setPagination({ ...pagination, total: res.total });
    setLoading(false);
  };

  return {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
  };
};
```

**Usage:**

```typescript
const { data, loading, pagination, handleFilter } = usePhieuSearchList({
  maBm: "CTD_BB_Phoinong",
  fixedFilters: { usercode: userInfo.maNV },
});
```

---

### 8. **Routing & Guards**

#### 8.1. Route Definition (`routes.tsx`)

```typescript
export const routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "bienbanphoinong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["NM.HRC1", "NM.CTD"]}>
              <BienBanPhoiNong />
            </RequireRole>
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: (
      <PublicLayout>
        <LoginPage />
      </PublicLayout>
    ),
  },
];
```

#### 8.2. RequireAuth Guard

```typescript
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

#### 8.3. RequireRole Guard

```typescript
const RequireRole = ({ children, allowedRoles }) => {
  const userInfo = JSON.parse(localStorage.getItem("userinfo") || "{}");
  const userRole = userInfo.tenNgan;

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};
```

---

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
