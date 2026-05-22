import { useLocation } from "react-router-dom";
import TaoPhieuPhoiNhapKho from "./TaoPhieuPhoiNhapKho";

const ChiTietPhoiNhapKho = () => {
  const location = useLocation();
  const type = (location.state as { type?: string } | null)?.type;

  return <TaoPhieuPhoiNhapKho type={type} />;
};

export default ChiTietPhoiNhapKho;
