export const HRC2_PHAN_LOAI_LABEL: Record<string, string> = {
  L1: "Loại 1",
  L2: "Loại 2",
  L2TP: "Loại 2 TP",
  L3: "Loại 3",
  L3TP: "Loại 3 TP",
  ND: "Ngắn dài",
  PP: "Phế phẩm",
};

export const HRC2_PHAN_LOAI_ORDER = ["L1", "L2", "L2TP", "L3", "L3TP", "ND", "PP"] as const;

export type Hrc2PhanLoai = (typeof HRC2_PHAN_LOAI_ORDER)[number];

export function getPhanLoaiLabel(phanLoai?: string | null): string {
  if (!phanLoai) return "";
  return HRC2_PHAN_LOAI_LABEL[phanLoai] ?? phanLoai;
}
