import { buildPhieuDieuChinhNMConfig, type PhieuDieuChinhNM } from "../../../utils/configs/phieuDieuChinhNM";
import PhieuDieuChinhList from "./PhieuDieuChinhList";
import TaoPhieuDieuChinh from "./TaoPhieuDieuChinh";

// Phiếu điều chỉnh số liệu của 1 nhà máy (NM.TKVV, NM.NL, NM.LC...): dùng chung trang với phiếu NM.LG nhưng truyền
// cấu hình riêng (phạm vi = các xưởng của phòng ban, chia tab theo xưởng, chỉ có Nhập / Xuất).
export const PhieuDieuChinhNMList = ({ nm, type }: { nm: PhieuDieuChinhNM; type?: string }) => (
  <PhieuDieuChinhList type={type} config={buildPhieuDieuChinhNMConfig(nm)} />
);

export const TaoPhieuDieuChinhNM = ({ nm }: { nm: PhieuDieuChinhNM }) => (
  <TaoPhieuDieuChinh config={buildPhieuDieuChinhNMConfig(nm)} />
);
