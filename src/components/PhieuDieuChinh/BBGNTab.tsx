/* eslint-disable @typescript-eslint/no-explicit-any */
import { message } from "antd";
import { LOAI_BBGN_NHAP, phieuDieuChinhApi, type LoaiBBGN } from "../../services/PhieuDieuChinhApi";
import BBGNDieuChinhTable, { type BBGNRow } from "../../pages/NMLG/PhieuDieuChinh/BBGNDieuChinhTable";
import XuongTabs, { type XuongItem } from "./XuongTabs";

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

  return (
    <XuongTabs xuongList={xuongList} activeXuong={activeXuong} onChange={onChangeXuong}>
      <BBGNDieuChinhTable
        loai={loai}
        rows={rows}
        onChange={onChange}
        editable={editable}
        nguoiKyMap={nguoiKyMap}
        loading={loading}
        filter={(r) => tabCuaDong(r) === activeXuong}
        filterKey={activeXuong}
        onReset={
          idphieu
            ? async (row, lyDo) => {
                try {
                  // Gửi kèm KL bên kia đang hiện trên màn hình: bên kia vừa sửa thì BE từ chối, không reset nhầm số mới
                  const klDangThay = loai === LOAI_BBGN_NHAP ? row.khoiLuongXuat : row.khoiLuongNhap;
                  await phieuDieuChinhApi.resetBenKiaBBGN(loai, idphieu, row.idCtBBGN, lyDo, idNguoiThucHien ?? null, klDangThay);
                  message.success("Đã reset số điều chỉnh của bên kia.");
                } catch (err: any) {
                  message.error(err?.response?.data?.message || "Không thể reset.");
                  throw err;
                }
              }
            : undefined
        }
        onResetLoaiSo={
          idphieu
            ? async (row, lyDo) => {
                try {
                  await phieuDieuChinhApi.resetLoaiSoBBGN(
                    loai, idphieu, row.idCtBBGN, lyDo, idNguoiThucHien ?? null, row.loaiSoBenKia ?? null);
                  message.success("Đã reset Loại số điều chỉnh của cả 2 bên.");
                } catch (err: any) {
                  message.error(err?.response?.data?.message || "Không thể reset loại số.");
                  throw err;
                }
              }
            : undefined
        }
      />
    </XuongTabs>
  );
};

export default BBGNTab;
