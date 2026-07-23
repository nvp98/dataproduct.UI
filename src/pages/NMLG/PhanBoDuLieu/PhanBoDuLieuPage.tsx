import { useState } from "react";
import { Card, Tabs } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import PhanBoFilterBar from "./components/PhanBoFilterBar";
import PhanBoNhomTab from "./components/PhanBoNhomTab";
import PhanBoThanCocTab from "./components/PhanBoThanCocTab";
import QuanLyNhomPhanBoTab from "./components/QuanLyNhomPhanBoTab";

const LOAI_PHAN_BO_QHLC = 1;
const TAB_THAN_COC = "thancoc";
const TAB_QUAN_LY_NHOM = "quanlynhom";

export default function PhanBoDuLieuPage() {
  const [ngay, setNgay] = useState<Dayjs>(dayjs());
  const [ca, setCa] = useState<number>(1);
  const [idLoCao, setIdLoCao] = useState<number>(1);
  const [activeTab, setActiveTab] = useState(String(LOAI_PHAN_BO_QHLC));

  const items = [
    {
      key: String(LOAI_PHAN_BO_QHLC),
      label: "QHLC",
      children: <PhanBoNhomTab loaiPhanBo={LOAI_PHAN_BO_QHLC} ngay={ngay} ca={ca} idLoCao={idLoCao} />,
    },
    {
      key: TAB_THAN_COC,
      label: "Than cốc (CVH + <10mm)",
      children: <PhanBoThanCocTab ngay={ngay} ca={ca} idLoCao={idLoCao} />,
    },
    {
      key: TAB_QUAN_LY_NHOM,
      label: "Quản lý nhóm",
      children: <QuanLyNhomPhanBoTab idLoCao={idLoCao} />,
    },
  ];

  return (
    <div className="p-4">
      <Card title="Phân bổ dữ liệu" size="small">
        <PhanBoFilterBar
          ngay={ngay}
          ca={ca}
          idLoCao={idLoCao}
          onChangeNgay={setNgay}
          onChangeCa={setCa}
          onChangeIdLoCao={setIdLoCao}
        />
        <Tabs items={items} activeKey={activeTab} onChange={setActiveTab} destroyOnHidden />
      </Card>
    </div>
  );
}
