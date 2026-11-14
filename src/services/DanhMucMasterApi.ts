import apiService from "./ApiService";

export interface PhongBanItem {
  id: number;
  tenNgan?: string | null;
  tenPhongBan?: string | null;
  hoatDong: boolean;
}

export interface XuongItem {
  id: number;
  tenXuong?: string | null;
  idPhongBan?: number | null;
  hoatDong: boolean;
}

// Danh mục master ít thay đổi — cache theo phiên làm việc
let phongBanCache: Promise<PhongBanItem[]> | null = null;
let xuongCache: Promise<XuongItem[]> | null = null;

export const DanhMucMasterApi = {
  getPhongBan: (): Promise<PhongBanItem[]> => {
    if (!phongBanCache) {
      phongBanCache = (apiService.get("/api/DanhMucMaster/phong-ban") as Promise<PhongBanItem[]>).catch((e) => {
        phongBanCache = null;
        throw e;
      });
    }
    return phongBanCache;
  },

  getXuong: (): Promise<XuongItem[]> => {
    if (!xuongCache) {
      xuongCache = (apiService.get("/api/DanhMucMaster/xuong") as Promise<XuongItem[]>).catch((e) => {
        xuongCache = null;
        throw e;
      });
    }
    return xuongCache;
  },
};
