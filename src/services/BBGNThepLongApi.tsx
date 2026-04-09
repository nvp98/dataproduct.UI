import type { FetchMeThoiRequest, LoadBBGNRequest } from "../models/BBGNThepLongModel";
import apiService from "./ApiService";

export const bbgbThepLongApi = {
  fetch: (payload: FetchMeThoiRequest) => apiService.post("/api/BBGNThepLong/fetch", payload),
  load: (payload: LoadBBGNRequest) => apiService.post("/api/BBGNThepLong/load", payload),
  // exportBienBan: (params?: Record<string, unknown>) =>
  //   apiService.get("/api/DLNMHRC2/export-excel-detail", {
  //     params,
  //     responseType: "blob",
  //     headers: {
  //       Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //     },
  //   }),
  // exportBienBanPDF: (params?: Record<string, unknown>) =>
  //   apiService.get("/api/DLNMHRC2/export-pdf-detail", {
  //     params,
  //     responseType: "blob",
  //     headers: { Accept: "application/pdf" },
  //   }),
};

