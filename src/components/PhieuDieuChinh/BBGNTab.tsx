/* eslint-disable @typescript-eslint/no-explicit-any */
import { message } from "antd";
import { LOAI_BBGN_NHAP, phieuDieuChinhApi, type LoaiBBGN } from "../../services/PhieuDieuChinhApi";
import BBGNDieuChinhTable, { apDungReset, apDungThayDoi, tinhKhoiLuongTuQuyKho, type BBGNRow } from "../../pages/NMLG/PhieuDieuChinh/BBGNDieuChinhTable";
import XuongTabs, { type XuongItem } from "./XuongTabs";
import TongHopTable, { type DongTongHop, type ThayDoiKL } from "./TongHopTable";

interface Props {
  /** LOAI_BBGN_NHAP (1) hoặc LOAI_BBGN_XUAT (3) — dùng chung 1 component cho cả Nhập và Xuất */
  loai: LoaiBBGN;
  rows: BBGNRow[];
  onChange: (rows: BBGNRow[]) => void;
  editable: boolean;
  nguoiKyMap: Map<number, string>;
  loading: boolean;
  xuongList: XuongItem[];
  activeXuong: string;
  onChangeXuong: (key: string) => void;
  /** Phiếu đã lưu mới reset được (reset ghi thẳng vào DB) */
  idphieu?: string;
  idNguoiThucHien?: number | null;
}

// Phần Nhập / Xuất: mỗi xưởng 1 tab, mỗi tab là bảng điều chỉnh BBGN của bên nhận hoặc bên giao.
const BBGNTab = ({
  loai,
  rows,
  onChange,
  editable,
  nguoiKyMap,
  loading,
  xuongList,
  activeXuong,
  onChangeXuong,
  idphieu,
  idNguoiThucHien,
}: Props) => {
  // Dòng chưa rõ xưởng (bản chụp cũ chưa điền ID xưởng) hiện ở xưởng đầu tiên để không bị mất
  const tabCuaDong = (r: BBGNRow): string =>
    xuongList.some((x) => x.id === r.idTab) ? String(r.idTab) : String(xuongList[0]?.id ?? "");

  const laNhan = loai === LOAI_BBGN_NHAP;

  // Gọi API reset (ghi thẳng vào DB) — phiếu chưa lưu thì không có
  const resetKLApi = idphieu
    ? async (row: BBGNRow, lyDo: string) => {
        try {
          // Gửi kèm KL bên kia đang hiện trên màn hình: bên kia vừa sửa thì BE từ chối, không reset nhầm số mới
          const klDangThay = laNhan ? row.khoiLuongXuat : row.khoiLuongNhap;
          await phieuDieuChinhApi.resetBenKiaBBGN(loai, idphieu, row.idCtBBGN, lyDo, idNguoiThucHien ?? null, klDangThay);
          message.success("Đã reset số điều chỉnh của bên kia.");
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Không thể reset.");
          throw err;
        }
      }
    : undefined;

  const resetLoaiApi = idphieu
    ? async (row: BBGNRow, lyDo: string) => {
        try {
          await phieuDieuChinhApi.resetLoaiSoBBGN(
            loai, idphieu, row.idCtBBGN, lyDo, idNguoiThucHien ?? null, row.loaiSoBenKia ?? null);
          message.success("Đã reset Loại số điều chỉnh của cả 2 bên.");
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Không thể reset loại số.");
          throw err;
        }
      }
    : undefined;

  // Dòng reset được: bên kia đã nhập KL hoặc đã chọn loại số, và phiếu bên kia chưa khóa
  const resetDuoc = (r: BBGNRow) =>
    !r.phieuBenKiaKhoa &&
    ((!!resetKLApi && (laNhan ? r.khoiLuongXuat : r.khoiLuongNhap) != null) ||
      (!!resetLoaiApi && r.loaiSoBenKia != null));

  // Reset từng dòng của 1 dòng tổng hợp với cùng 1 lý do; dừng ở dòng lỗi (lỗi đã được báo), vẫn cập nhật các dòng đã xong
  const resetNhom = async (refs: string[], lyDo: string) => {
    const xong = new Map<number, BBGNRow>();
    for (const ref of refs) {
      const row = rows.find((r) => String(r.idCtBBGN) === ref);
      if (!row || !resetDuoc(row)) continue;
      const klCu = laNhan ? row.khoiLuongXuat : row.khoiLuongNhap;
      const resetKL = klCu != null && !!resetKLApi;
      const resetLoai = row.loaiSoBenKia != null && !!resetLoaiApi;
      try {
        if (resetKL) await resetKLApi!(row, lyDo);
        if (resetLoai) await resetLoaiApi!(row, lyDo);
        xong.set(row.idCtBBGN, apDungReset(row, laNhan, lyDo, resetKL, resetLoai, klCu));
      } catch {
        break;
      }
    }
    if (xong.size > 0) onChange(rows.map((r) => xong.get(r.idCtBBGN) ?? r));
  };

  // Sửa Loại số điều chỉnh cho mọi dòng của 1 dòng tổng hợp
  const doiLoaiSo = (refs: string[], loaiSo: number | null) =>
    onChange(
      rows.map((r) =>
        refs.includes(String(r.idCtBBGN)) ? apDungThayDoi(r, { loaiSoDieuChinh: loaiSo }, laNhan) : r
      )
    );

  // Nhập KL hoặc KL quy khô của 1 dòng — dòng kia tự tính (cùng quy tắc với bảng chi tiết)
  const doiKL = (ref: string, change: ThayDoiKL) => {
    const row = rows.find((r) => String(r.idCtBBGN) === ref);
    if (!row) return;
    if ("quyKho" in change) {
      if (change.quyKho != null && tinhKhoiLuongTuQuyKho(change.quyKho, row.loaiSoDieuChinh, row.doAm) == null) {
        message.warning(
          row.loaiSoDieuChinh == null
            ? "Chọn Loại số điều chỉnh trước khi nhập KL quy khô."
            : "Dòng này không có độ ẩm nên không tính ngược được từ KL quy khô (Sau ẩm)."
        );
        return;
      }
      const f = laNhan ? "klQuyKhoNhap" : "klQuyKhoXuat";
      onChange(rows.map((r) => (r === row ? apDungThayDoi(r, { [f]: change.quyKho } as Partial<BBGNRow>, laNhan) : r)));
    } else {
      const f = laNhan ? "khoiLuongNhap" : "khoiLuongXuat";
      onChange(rows.map((r) => (r === row ? apDungThayDoi(r, { [f]: change.kl } as Partial<BBGNRow>, laNhan) : r)));
    }
  };

  // Tổng hợp: số của bên đang xem (Nhập → KL nhập, Xuất → KL xuất), cộng theo xưởng của tab
  const dongTongHop: DongTongHop[] = rows.map((r) => ({
    tenNhom: r.tenNhomNVL,
    tenNVL: r.tenVatTu,
    maLo: r.maLo,
    idCa: r.idCa,
    ref: String(r.idCtBBGN),
    khoaLoaiSo: r.loaiSoBenKia != null,
    resetDuoc: resetDuoc(r),
    biKhoaReset:
      !!r.phieuBenKiaKhoa &&
      ((laNhan ? r.khoiLuongXuat : r.khoiLuongNhap) != null || r.loaiSoBenKia != null),
    idXuong: tabCuaDong(r),
    doAm: r.doAm,
    loaiSo: r.loaiSoDieuChinh,
    kl: loai === LOAI_BBGN_NHAP ? r.khoiLuongNhap : r.khoiLuongXuat,
    quyKho: loai === LOAI_BBGN_NHAP ? r.klQuyKhoNhap : r.klQuyKhoXuat,
  }));

  return (
    <XuongTabs
      xuongList={xuongList}
      activeXuong={activeXuong}
      onChange={onChangeXuong}
      tongHop={<TongHopTable
          rows={dongTongHop}
          xuongList={xuongList}
          loading={loading}
          editable={editable}
          onChangeLoaiSo={doiLoaiSo}
          onChangeKL={doiKL}
          onReset={idphieu ? resetNhom : undefined}
        />}
    >
      <BBGNDieuChinhTable
        loai={loai}
        rows={rows}
        onChange={onChange}
        editable={editable}
        nguoiKyMap={nguoiKyMap}
        loading={loading}
        filter={(r) => tabCuaDong(r) === activeXuong}
        filterKey={activeXuong}
        onReset={resetKLApi}
        onResetLoaiSo={resetLoaiApi}
      />
    </XuongTabs>
  );
};

export default BBGNTab;
