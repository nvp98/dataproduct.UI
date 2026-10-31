import type { ReactElement } from "react";
import type { RouteObject } from "react-router-dom";
import { PhieuDieuChinhNMList, TaoPhieuDieuChinhNM } from "../pages/NMLG/PhieuDieuChinh/PhieuDieuChinhNM";
import { PHIEU_DIEU_CHINH_NM, type PhieuDieuChinhNM } from "../utils/configs/phieuDieuChinhNM";
import RequireAuth from "./RequireAuth";
import RequireRole from "./RequireRole";

const bao = (element: ReactElement) => (
  <RequireAuth>
    <RequireRole allowedRoles={["admin", "user"]}>{element}</RequireRole>
  </RequireAuth>
);

// Route phiếu điều chỉnh của 1 nhà máy: danh sách, việc đến tôi, xem phiếu, tạo, sửa, chi tiết.
// Đường dẫn tương đối theo gốc của layout chính (không có dấu "/" đầu), như các route khác trong routes.tsx.
// key={nm.key}: đổi giữa các nhà máy thì mount lại trang, không giữ state của nhà máy trước.
const routesCuaNM = (nm: PhieuDieuChinhNM): RouteObject[] => [
  { path: `phieudieuchinh${nm.key}`, element: bao(<PhieuDieuChinhNMList key={nm.key} nm={nm} />) },
  { path: `viecdentoi/phieudieuchinh${nm.key}`, element: bao(<PhieuDieuChinhNMList key={nm.key} nm={nm} type="viecdentoi" />) },
  { path: `xemphieu/phieudieuchinh${nm.key}`, element: bao(<PhieuDieuChinhNMList key={nm.key} nm={nm} type="xemphieu" />) },
  { path: `taophieudieuchinh${nm.key}`, element: bao(<TaoPhieuDieuChinhNM key={nm.key} nm={nm} />) },
  { path: `taophieudieuchinh${nm.key}/:id`, element: bao(<TaoPhieuDieuChinhNM key={nm.key} nm={nm} />) },
  { path: `chitietphieudieuchinh${nm.key}/:id`, element: bao(<TaoPhieuDieuChinhNM key={nm.key} nm={nm} />) },
];

export const phieuDieuChinhNMRoutes: RouteObject[] = PHIEU_DIEU_CHINH_NM.flatMap(routesCuaNM);
