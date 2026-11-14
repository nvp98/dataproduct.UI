import { useEffect, useMemo, useState } from "react";
import { DanhMucMasterApi } from "../services/DanhMucMasterApi";
import type { PhongBanItem, XuongItem } from "../services/DanhMucMasterApi";

/**
 * Options chọn BP/NM và Xưởng (DB master PRODUCTDATA) + hàm tra tên theo Id.
 * Options chỉ gồm bản ghi đang hoạt động; hàm tra tên dùng cả bản ghi đã ngưng (cho dữ liệu cũ).
 */
export const useDanhMucMasterOptions = () => {
  const [phongBans, setPhongBans] = useState<PhongBanItem[]>([]);
  const [xuongs, setXuongs] = useState<XuongItem[]>([]);

  useEffect(() => {
    DanhMucMasterApi.getPhongBan().then(setPhongBans).catch(() => setPhongBans([]));
    DanhMucMasterApi.getXuong().then(setXuongs).catch(() => setXuongs([]));
  }, []);

  return useMemo(() => {
    const pbMap = new Map(phongBans.map((x) => [x.id, x.tenNgan || x.tenPhongBan || String(x.id)]));
    const xuongMap = new Map(xuongs.map((x) => [x.id, x.tenXuong || String(x.id)]));
    const xuongHoatDong = xuongs.filter((x) => x.hoatDong);
    const toXuongOption = (x: XuongItem) => ({ value: x.id, label: x.tenXuong ?? String(x.id) });

    return {
      phongBanOptions: phongBans
        .filter((x) => x.hoatDong)
        .map((x) => ({
          value: x.id,
          label: x.tenNgan ? `${x.tenNgan} - ${x.tenPhongBan ?? ""}` : x.tenPhongBan ?? String(x.id),
        })),
      xuongOptions: xuongHoatDong.map(toXuongOption),
      /** Xưởng đang hoạt động thuộc phòng ban; chưa chọn phòng ban → tất cả xưởng đang hoạt động. */
      xuongOptionsTheoPB: (idPhongBan?: number | null) =>
        (idPhongBan == null ? xuongHoatDong : xuongHoatDong.filter((x) => x.idPhongBan === idPhongBan)).map(toXuongOption),
      tenPhongBan: (id?: number | null) => (id == null ? null : pbMap.get(id) ?? String(id)),
      tenXuong: (id?: number | null) => (id == null ? null : xuongMap.get(id) ?? String(id)),
    };
  }, [phongBans, xuongs]);
};
