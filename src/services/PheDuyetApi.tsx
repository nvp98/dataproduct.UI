import apiService from "./ApiService";

export const PheDuyetApi = {
  //   getData: (params?: any) => apiService.get("/api/Phieus", { params }),

  //   postData: (data: any) => apiService.post("/api/Phieus", data),

  getDetail: (id: string) => apiService.get(`/api/BmPheDuyet/${id}`),
  putData: (id: number, data: any) =>
    apiService.put(`/api/BmPheDuyet/${id}`, data),
};
