import { Card, Col, DatePicker, Row, Select } from "antd";
import type { Dayjs } from "dayjs";

export const LO_CAO_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  label: `Lò cao ${n}`,
  value: n,
}));

const CA_OPTIONS = [
  { label: "Ca 1", value: 1 },
  { label: "Ca 2", value: 2 },
];

interface PhanBoFilterBarProps {
  ngay: Dayjs;
  ca: number;
  idLoCao: number;
  onChangeNgay: (ngay: Dayjs) => void;
  onChangeCa: (ca: number) => void;
  onChangeIdLoCao: (idLoCao: number) => void;
}

export default function PhanBoFilterBar({
  ngay,
  ca,
  idLoCao,
  onChangeNgay,
  onChangeCa,
  onChangeIdLoCao,
}: PhanBoFilterBarProps) {
  return (
    <Card size="small" className="mb-3">
      <Row gutter={12} align="middle">
        <Col span={6}>
          <div className="mb-1 text-sm text-gray-500">Ngày</div>
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            value={ngay}
            allowClear={false}
            onChange={(v) => v && onChangeNgay(v)}
          />
        </Col>
        <Col span={6}>
          <div className="mb-1 text-sm text-gray-500">Ca</div>
          <Select
            style={{ width: "100%" }}
            value={ca}
            options={CA_OPTIONS}
            onChange={onChangeCa}
          />
        </Col>
        <Col span={6}>
          <div className="mb-1 text-sm text-gray-500">Lò cao</div>
          <Select
            style={{ width: "100%" }}
            value={idLoCao}
            options={LO_CAO_OPTIONS}
            onChange={onChangeIdLoCao}
          />
        </Col>
      </Row>
    </Card>
  );
}
