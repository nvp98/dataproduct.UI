import { useEffect, useMemo, useState } from "react";
import { Tabs } from "antd";
import ThongKeBBGNThepLong from "./ThongKeBBGNThepLong";
import ThongKeTieuHaoHRC1 from "./ThongKeTieuHaoHRC1";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { getAllowedScope } from "../../../utils/helpers/checkAdminRole";

type MainTabKey = "tieuhao" | "bbgn";

const MAIN_TAB_SCOPE_MAP: Record<MainTabKey, string> = {
  tieuhao: "TIEUHAO",
  bbgn: "BBGN",
};

const ThongKeHRC1 = () => {
  const [mainTabKey, setMainTabKey] = useState<MainTabKey>("tieuhao");

  const allowedScope = useMemo(() => getAllowedScope(BM_CONFIG.HRC1.THONGKE_HRC1), []);

  const mainTabItems = useMemo(() => {
    const all: { key: MainTabKey; label: string }[] = [
      { key: "tieuhao", label: "Thống kê tiêu hao HRC1" },
      { key: "bbgn", label: "Thống kê BBGN thép lỏng" },
    ];
    if (allowedScope === null) return all;
    return all.filter((t) => allowedScope.includes(MAIN_TAB_SCOPE_MAP[t.key]));
  }, [allowedScope]);

  useEffect(() => {
    if (mainTabItems.length > 0 && !mainTabItems.some((t) => t.key === mainTabKey)) {
      setMainTabKey(mainTabItems[0].key);
    }
  }, [mainTabItems, mainTabKey]);

  return (
    <div style={{ margin: 2 }}>
      <Tabs activeKey={mainTabKey} onChange={(k) => setMainTabKey(k as MainTabKey)} items={mainTabItems} />
      {mainTabKey === "bbgn" ? <ThongKeBBGNThepLong /> : <ThongKeTieuHaoHRC1 />}
    </div>
  );
};

export default ThongKeHRC1;
