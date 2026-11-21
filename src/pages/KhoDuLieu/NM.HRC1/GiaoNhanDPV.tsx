import KdlForm from "../KdlForm";
import type { KdlTabThem } from "../KdlForm";
import { MappingNvlDPV, MappingXuongDPV } from "./MappingGiaoNhanDPV";
import TongHopNhomGiaoNhanDPV from "./TongHopNhomGiaoNhanDPV";
import PhanBoGiaoNhanDPV from "./PhanBoGiaoNhanDPV";

// Trang Giao nhận Đúc phôi vuông = form KDL HRC1_DPV_GN + tab Tổng hợp theo nhóm + 2 tab cấu hình mapping ở cuối.
const TAB_THEM: KdlTabThem[] = [
  { key: "thNhom", label: "Tổng hợp theo nhóm", render: (k) => <TongHopNhomGiaoNhanDPV {...k} /> },
  { key: "phanBo", label: "Phân bổ BBGN", render: (k) => <PhanBoGiaoNhanDPV {...k} /> },
  { key: "mapXuong", label: "Mapping xưởng", render: (k) => <MappingXuongDPV {...k} /> },
  { key: "mapNvl", label: "Mapping NVL", render: (k) => <MappingNvlDPV {...k} /> },
];

const GiaoNhanDPV = () => <KdlForm maForm="HRC1_DPV_GN" tabThem={TAB_THEM} />;

export default GiaoNhanDPV;
