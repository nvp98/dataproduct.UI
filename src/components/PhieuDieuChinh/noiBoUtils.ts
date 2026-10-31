/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PhieuDieuChinhChiTietDto } from "../../services/PhieuDieuChinhApi";

export interface TableRow {
  key?: string;
  [key: string]: any;
}

// Loại điều chỉnh của phần Nội bộ - Xuất vào sản xuất (chi tiết lưu trong LG_PhieuDieuChinh_ChiTiet chỉ còn phần này)
export const LOAI_NOI_BO = 2;

// Đánh lại "Thứ tự" theo vị trí dòng hiện tại trong bảng
export const renumberThuTu = (rows: TableRow[]): TableRow[] =>
  rows.map((r, idx) => ({ ...r, thuTu: idx + 1 }));

export const toNum = (v: any): number | null =>
  v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

// "Trước ẩm": không cần Độ ẩm, KL quy khô Nhập = Khối lượng Nhập.
// "Sau ẩm": KL quy khô Nhập tự tính từ Khối lượng nhập + Độ ẩm.
// Sau khi tính xong, Bên nhập mới gán qua Bên xuất.
//
// "Người điều chỉnh nhận" không còn chọn tay — tự động gán người đang đăng nhập ngay khi
// họ (bên nhận) sửa Khối lượng Nhập hoặc Độ ẩm của dòng (so với prevRows để biết có thật sự
// vừa sửa). "Người điều chỉnh giao" tách riêng: người dùng (bên giao) tự tích xác nhận (xem
// cột "Người điều chỉnh giao" trong tableColumns), không tự động theo thao tác sửa số liệu.
export const recomputeRows = (
  rows: TableRow[],
  prevRows: TableRow[] = [],
  currentUserId?: number | null,
): TableRow[] => {
  const prevByKey = new Map(prevRows.map((r) => [r.key, r]));

  return rows.map((row) => {
    const loaiSo = row.loaiSoDieuChinh != null ? String(row.loaiSoDieuChinh) : null;
    const khoiLuongNhap = toNum(row.khoiLuongNhap);

    let doAm = row.doAm;
    let khoiLuongQuyKhoNhap: number | null;
    if (loaiSo === "1") {
      doAm = null;
      khoiLuongQuyKhoNhap = khoiLuongNhap;
    } else if (loaiSo === "2") {
      const doAmNum = toNum(row.doAm);
      khoiLuongQuyKhoNhap =
        khoiLuongNhap != null && doAmNum != null
          ? Number((khoiLuongNhap * (1 - doAmNum / 100)).toFixed(3))
          : null;
    } else {
      khoiLuongQuyKhoNhap = toNum(row.khoiLuongQuyKhoNhap);
    }

    let nguoiDieuChinhNhan = row.nguoiDieuChinhNhan;
    let thoiGianDieuChinhNhan = row.thoiGianDieuChinhNhan;
    const prev = prevByKey.get(row.key);
    if (currentUserId != null && prev) {
      const khoiLuongDaDoi = String(prev.khoiLuongNhap ?? "") !== String(row.khoiLuongNhap ?? "");
      const doAmDaDoi = String(prev.doAm ?? "") !== String(row.doAm ?? "");
      if (khoiLuongDaDoi || doAmDaDoi) {
        nguoiDieuChinhNhan = currentUserId;
        thoiGianDieuChinhNhan = new Date().toISOString();
      }
    }

    return {
      ...row,
      doAm,
      khoiLuongQuyKhoNhap,
      khoiLuongXuat: khoiLuongNhap,
      khoiLuongQuyKhoXuat: khoiLuongQuyKhoNhap,
      nguoiDieuChinhNhan,
      thoiGianDieuChinhNhan,
    };
  });
};

// LG_PhieuDieuChinh_ChiTiet (DB) → TableRow hiển thị trên UI — dùng chung cho initData
// (mở lại phiếu đã lưu) và handleLoadFromSource (sau khi sync-tu-bbgn/sync-tu-naplieulocao insert xong).
export const chiTietDtoToRows = (chiTiet: PhieuDieuChinhChiTietDto[]): TableRow[] =>
  chiTiet.map((c, idx) => ({
    key: `ct-${c.id ?? idx}`,
    // Id thật trong LG_PhieuDieuChinh_ChiTiet — dùng để lưu theo từng dòng (xem saveChiTiet).
    // Dòng ở phiếu mới chưa Lưu thì không có id này.
    id: c.id,
    idNVL: c.idNVL,
    tenNVL: c.tenNVL,
    idNVLChiTiet: c.idNVLChiTiet,
    idNhomNVL: c.idNhomNVL,
    dvt: c.dvt,
    maLo: c.maLo,
    thuTu: c.thuTu ?? idx + 1,
    loaiDieuChinh: c.loaiDieuChinh,
    loaiSoDieuChinh: c.loaiSoDieuChinh,
    phongBanXuat: c.phongBanXuat,
    xuongXuat: c.xuongXuat,
    khoiLuongXuat: c.khoiLuongXuat,
    khoiLuongQuyKhoXuat: c.khoiLuongQuyKhoXuat,
    phongBanNhap: c.phongBanNhap,
    xuongNhap: c.xuongNhap,
    khoiLuongNhap: c.khoiLuongNhap,
    khoiLuongQuyKhoNhap: c.khoiLuongQuyKhoNhap,
    doAm: c.doAm,
    viTri: c.viTri,
    phanLoai: c.phanLoai,
    ghiChu: c.ghiChu,
    // "Phiên bản" của dòng lúc tải — gửi lại khi Lưu để BE phát hiện người khác đã sửa (409).
    thoiGianSua: c.thoiGianSua,
    nguoiDieuChinhNhan: c.nguoiDieuChinhNhan,
    thoiGianDieuChinhNhan: c.thoiGianDieuChinhNhan,
    // Khóa liên kết ngược tới dòng BBGN nguồn — giữ lại để khi Lưu không bị mất, và để lần
    // "Tải dữ liệu" sau khớp lại đúng dòng cũ thay vì tạo trùng.
    idCtBBGN: c.idCtBBGN ?? null,
    // Lò cao của dòng — quyết định dòng nằm ở tab nào (xem LO_CAO_TABS)
    idLoCao: c.idLoCao ?? null,
    idCa: c.idCa ?? null,
  }));
