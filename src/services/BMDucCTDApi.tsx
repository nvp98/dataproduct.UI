import apiService from "./ApiService";

interface InsertSanLuongPhoiPayload {
  idPhieu: string;
  soPhieu: string;
  ngaySX: string;
  kip: string;
  ca: number;
  mayDuc: number;
  table1: Array<{
    kipNgay: string;
    macThep: string;
    kichThuoc: string;
    stLoai1: number;
    klLoai1: number;
    stPhoiNgan: number;
    klPhoiNgan: number;
    stLoai2: number;
    klLoai2: number;
    stLoai3: number;
    klLoai3: number;
    tongSoThanh: number;
    tongKhoiLuong: number;
  }>;
}

export const sanLuongPhoiApi = {
  getByKipNgay: (params: {
    ca: string;
    kip: string;
    NgaySX: string;
  }) =>
    apiService.get("/api/BMDucCTD/sanluongphoithep", { params }),
  
  exportPdf: (idphieu: string) =>
    apiService.get<Blob>(`/api/BMDucCTD/sanluongphoithep/export-pdf/${idphieu}`, {
      responseType: "blob",
    }),
  
  insertSanLuongPhoi: (payload: InsertSanLuongPhoiPayload) =>
    apiService.post("/api/BMDucCTD/InsertSanLuongPhoi", payload),
};

export const phoiNhapKhoApi = {
  getByKipNgay: (params: {
    ca: number;
    kip: string;
    ngaySX: string;
    mayduc: number;
  }) =>
    apiService.get("/api/BMDucCTD/Getphoinhapkho", { params }),
};