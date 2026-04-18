import apiService from "./ApiService";


export interface InsertPhoiNhapKhoTableRow {
  soPhieu?: string;
  ngaySX?: string;
  ca?: number;
  kip?: string;
  mayDuc?: number;
  me: string;
  mac: string;
  kichThuoc: string;
  stLoai1: number;
  klLoai1: number;
  stPhoiNgan: number;
  klPhoiNgan: number;
  cdPhoiNgan: number;
  stLoai2: number;
  klLoai2: number;
  stLoai2TP: number;
  klLoai2TP: number;
  stLoai3: number;
  klLoai3: number;
  tongSoThanh: number;
  tongKhoiLuong: number;
}

export interface InsertPhoiNhapKhoRequest {
  idPhieu: string;
  soPhieu: string;
  ngaySX: string;
  ca: number;
  kip: string;
  mayDuc: number;
  nguoiTaoId?: number;
  table1: InsertPhoiNhapKhoTableRow[];
}

export interface PhoiNhapKhoListItem {
  id: number;
  idPhieu: string;
  soPhieu: string;
  ngaySX: string;
  kip: string;
  ca: number;
  mayDuc: number;
  me: string;
  mac: string;
  kichThuoc: string;
  stLoai1?: number;
  klLoai1?: number;
  stPhoiNgan?: number;
  klPhoiNgan?: number;
  cdPhoiNgan?: number;
  stLoai2?: number;
  klLoai2?: number;
  stLoai2TP?: number;
  klLoai2TP?: number;
  stLoai3?: number;
  klLoai3?: number;
  tongSoThanh?: number;
  tongKhoiLuong?: number;
  tthd?: boolean;
  thoiGianTao: string;
}

export interface ThuHoiPhoiNhapKhoRequest {
  ids: number[];
}
//============================= SẢN LƯỢNG PHÔI  =============================
export const sanLuongPhoiApi = {
  getByKipNgay: (params: { ca: string; kip: string; NgaySX: string }) =>
    apiService.get("/api/BMDucCTD/sanluongphoithep", { params }),

  // exportPdf: (idphieu: string) =>
  //   apiService.get<Blob>(`/api/BMDucCTD/sanluongphoithep/export-pdf/${idphieu}`, {
  //     responseType: "blob",
  //   }),

  exportSanLuongPdf: (params: {
    NgaySX?: string;
    Ca?: number;
    Kip?: string;
    idPhieu?: string;
  }) =>
    apiService.get<Blob>("/api/BMDucCTD/export-sanluong-pdf", {
      params,
      responseType: "blob",
    }),
  exportExcelSanLuongPhoi: (params: { fromDate?: string; toDate?: string }) =>
    apiService.get<Blob>("/api/BMDucCTD/export-excelSanLuongPhoi", {
      params,
      responseType: "blob",
    }),
  deleteSanLuongPhoiByIdPhieu: (idPhieu: string) =>
    apiService.delete(`/api/BMDucCTD/DeleteSanLuongPhoi/${idPhieu}`),
};

// ============================= PHÔI NHẬP KHO =============================
export const phoiNhapKhoApi = {
  getByKipNgay: (params: {
    ca: number;
    kip: string;
    ngaySX: string;
    mayduc: number;
  }) => apiService.get("/api/BMDucCTD/Getphoinhapkho", { params }),

  insertPhoiNhapKho: (payload: InsertPhoiNhapKhoRequest) =>
    apiService.post("/api/BMDucCTD/InsertPhoiNhapKho", payload),

  deletePhoiNhapKhoByIdPhieu: (idPhieu: string) =>
    apiService.delete(`/api/BMDucCTD/DeletePhoiNhapKho/${idPhieu}`),

  hidePhoiNhapKhoByIdPhieu: (idPhieu: string) =>
    apiService.patch(`/api/BMDucCTD/HidePhoiNhapKho/${idPhieu}`),

  restorePhoiNhapKhoByIdPhieu: (idPhieu: string) =>
    apiService.patch(`/api/BMDucCTD/RestorePhoiNhapKho/${idPhieu}`),

  exportPhoiNhapKhoPdf: (params: {
    NgaySX?: string;
    Ca?: number;
    Kip?: string;
    idPhieu?: string;
  }) =>
    apiService.get<Blob>("/api/BMDucCTD/export-phoinhapkho-pdf", {
      params,
      responseType: "blob",
    }),
  // thêm đoạn này
  exportExcelPhoiNhapKho: (params: { fromDate?: string; toDate?: string }) =>
    apiService.get<Blob>("/api/BMDucCTD/export-excelPhoiNhapKho", {
      params,
      responseType: "blob",
    }),
  exportExcelPhoiNhapKhoPKH: (params: { fromDate?: string; toDate?: string }) =>
    apiService.get<Blob>("/api/BMDucCTD/export-excelPhoiNhapKhoPKH", {
      params,
      responseType: "blob",
    }),

  getPhoiNhapKhoList: (params: {
    idPhieu?: string;
    fromDate?: string;
    toDate?: string;
    kip?: string;
    ca?: number;
    mayDuc?: number;
    soPhieu?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiService.get<{ data: PhoiNhapKhoListItem[]; total: number }>(
      "/api/BMDucCTD/PhoiNhapKhoNhanPhoi",
      { params },
    ),

  thuHoiPhoiNhapKho: (payload: ThuHoiPhoiNhapKhoRequest) =>
    apiService.post("/api/BMDucCTD/ThuHoiPhoiNhapKho", payload),
};
