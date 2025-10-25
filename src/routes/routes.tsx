// routes.tsx
import MainLayout from "../layouts/MainLayout";
import {
  Home,
  Dashboard,
  Reports,
  Settings,
  DemoForm,
  TaoYeuCau,
  BienBanPhoiNong,
  BienBanPhoiNguoi,
} from "../pages";
import LoginPage from "../pages/Login/LoginPage";
import NotFound from "../pages/NotFound/NotFound";
import RequireAuth from "./RequireAuth";
import { Navigate } from "react-router-dom";
import RequireRole from "./RequireRole";
import TaoPhieuPhoiNong from "../pages/NMCTD/BienBanPhoiNong/TaoPhieuPhoiNong";
import TaoPhieuPhoiNguoi from "../pages/NMCTD/BienBanPhoiNguoi/TaoPhieuPhoiNguoi";
import NhatKyQuangTH from "../pages/NM.NL/NhatKyQuangTH/NhatKyQuangTH";
import TaoPhieuNhatKyQuang from "../pages/NM.NL/NhatKyQuangTH/TaoNhatKyQuangTH";
import BienBanThepLong from "../pages/NM.HRC1/BienBanThepLong/BienBanThepLong";
import TieuHaoLoThoi from "../pages/NM.HRC1/TieuHaoLoThoi/TieuHaoLoThoi";
import TaoTieuHaoLoThoi from "../pages/NM.HRC1/TieuHaoLoThoi/TaoTieuHaoLoThoi";
import TaoPhieuThepLong from "../pages/NM.HRC1/BienBanThepLong/TaoBienBanThepLong";
import ChiTietPhieuPhoiNong from "../pages/NMCTD/BienBanPhoiNong/ChiTietPhieuPhoiNong";
import SanLuongPhoi from "../pages/KhoDuLieu/NM.CTD/SanLuongPhoi";
import BKNguyenLieu from "../pages/KhoDuLieu/NM.NL/BKNguyenLieu";

export const routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <Home />
          </RequireAuth>
        ),
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        ),
      },
      {
        path: "demo-form",
        element: (
          <RequireAuth>
            <DemoForm />
          </RequireAuth>
        ),
      },
      {
        path: "taoyeucau",
        element: (
          <RequireAuth>
            <TaoYeuCau />
          </RequireAuth>
        ),
      },
      {
        path: "yeu-cau/:id", // thêm param id
        element: (
          <RequireAuth>
            <TaoYeuCau />
          </RequireAuth>
        ),
      },
      {
        path: "reports",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <Reports />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "settings",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <Settings />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "sanluongphoi",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <SanLuongPhoi />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "nguyennhienlieu",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <BKNguyenLieu />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "bienbanphoinong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <BienBanPhoiNong />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "viecdentoi/bienbanphoinong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <BienBanPhoiNong type="viecdentoi" />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "taophieuphoinong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TaoPhieuPhoiNong />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "chitietphieuphoinong/:id",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <ChiTietPhieuPhoiNong />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "bienbanphoinguoi",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <BienBanPhoiNguoi />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "taophieuphoinguoi",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TaoPhieuPhoiNguoi />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "nhatkyquangtrunghoa",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <NhatKyQuangTH />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "taophieunhatkyquang",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TaoPhieuNhatKyQuang />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "bienbantheplong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <BienBanThepLong />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "taophieutheplong",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TaoPhieuThepLong />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "tieuhaolothoi",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TieuHaoLoThoi />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "taotieuhaolothoi",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "user"]}>
              <TaoTieuHaoLoThoi />
            </RequireRole>
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/home",
    element: <Navigate to="/" replace />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];
