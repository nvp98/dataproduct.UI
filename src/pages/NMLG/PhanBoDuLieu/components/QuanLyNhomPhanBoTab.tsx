/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tabs, Tag, Typography, message,
} from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  nhomPhanBoApi,
  tyLePhanBoApi,
  type NhomPhanBoDto,
  type NvlNhomPhanBoDto,
} from "../../../../services/PhanBoApi";
import { lgnlNvlApi, type LGNLNvlDto } from "../../../../services/LGNLApi";
import { LO_CAO_OPTIONS } from "./PhanBoFilterBar";

const { Title } = Typography;

// Than cốc <10mm dùng CHUNG cấu hình nhóm/NVL với CVH (2) — không có tab/lựa chọn riêng cho 3
const LOAI_PHAN_BO_TABS = [
  { key: "1", label: "QHLC" },
  { key: "2", label: "Than cốc (CVH + <10mm)" },
];

const PHUONG_THUC_OPTIONS = [
  { label: "Tỷ trọng nội bộ + dòng dư", value: 1 },
  { label: "Tỷ lệ nhập tay", value: 2 },
];

const PHUONG_THUC_TY_LE_NHAP_TAY = 2;

function getCurrentUserId(): number | null {
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};
  return (
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userInfoObj?.idTaiKhoan ??
    null
  );
}

interface QuanLyNhomPhanBoTabProps {
  ngay: Dayjs;
  ca: number;
  idLoCao: number;
}

export default function QuanLyNhomPhanBoTab({ ngay, ca, idLoCao }: QuanLyNhomPhanBoTabProps) {
  const [loaiPhanBo, setLoaiPhanBo] = useState(1);
  const [nhomList, setNhomList] = useState<NhomPhanBoDto[]>([]);
  const [loadingNhom, setLoadingNhom] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingNhom, setEditingNhom] = useState<NhomPhanBoDto | null>(null);
  const [form] = Form.useForm();

  const [selectedNhom, setSelectedNhom] = useState<NhomPhanBoDto | null>(null);
  const [nvlList, setNvlList] = useState<LGNLNvlDto[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [copyLoading, setCopyLoading] = useState(false);

  const fetchNhom = useCallback(async () => {
    setLoadingNhom(true);
    try {
      const res = await nhomPhanBoApi.getList(loaiPhanBo, idLoCao);
      setNhomList(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách nhóm phân bổ");
    } finally {
      setLoadingNhom(false);
    }
  }, [loaiPhanBo, idLoCao]);

  useEffect(() => {
    fetchNhom();
    setSelectedNhom(null);
  }, [fetchNhom]);

  // NVL khác nhau theo từng lò cao — chỉ nạp/hiển thị danh mục NVL của lò cao đang chọn
  useEffect(() => {
    lgnlNvlApi
      .getList({ idLoCao })
      .then((res) => setNvlList(Array.isArray(res) ? res : []))
      .catch(() => message.error("Lỗi khi tải danh mục NVL"));
  }, [idLoCao]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ loaiPhanBo, phuongThucPhanBo: 1, idLoCao });
    setEditingNhom(null);
    setModalOpen(true);
  };

  const openEdit = (row: NhomPhanBoDto) => {
    form.setFieldsValue({
      tenNhom: row.tenNhom,
      loaiPhanBo: row.loaiPhanBo,
      phuongThucPhanBo: row.phuongThucPhanBo,
      maVatTu: row.maVatTu,
      thuTu: row.thuTu,
      idLoCao: row.idLoCao,
    });
    setEditingNhom(row);
    setModalOpen(true);
  };

  const handleDeleteNhom = async (id: number) => {
    try {
      await nhomPhanBoApi.delete(id);
      message.success("Đã xóa nhóm phân bổ");
      if (selectedNhom?.id === id) setSelectedNhom(null);
      fetchNhom();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi xóa nhóm phân bổ");
    }
  };

  const handleSubmitNhom = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);
      if (editingNhom) {
        await nhomPhanBoApi.update(editingNhom.id, values);
        message.success("Cập nhật nhóm phân bổ thành công");
      } else {
        await nhomPhanBoApi.create(values);
        message.success("Thêm nhóm phân bổ thành công");
      }
      setModalOpen(false);
      fetchNhom();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || "Lỗi khi lưu nhóm phân bổ");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopy = async () => {
    const idNguoiThucHien = getCurrentUserId();
    if (!idNguoiThucHien) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setCopyLoading(true);
    try {
      const res = await nhomPhanBoApi.saoChep({
        loaiPhanBo,
        ngayDich: ngay.format("YYYY-MM-DD"),
        caDich: ca,
        idLoCaoDich: idLoCao,
        idNguoiThucHien,
      });
      message.success(
        `Đã sao chép ${res.soNvlDaCopy} NVL và ${res.soTyLeDaCopy} tỷ lệ từ Ngày ` +
          `${dayjs(res.ngayNguon).format("DD/MM/YYYY")}, Ca ${res.caNguon} vào cấu hình hiện tại.`
      );
      fetchNhom();
      setRefreshToken((t) => t + 1);
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi sao chép cấu hình");
    } finally {
      setCopyLoading(false);
    }
  };

  const nhomColumns: ColumnsType<NhomPhanBoDto> = [
    { title: "Tên nhóm", dataIndex: "tenNhom", key: "tenNhom" },
    {
      title: "Phương thức",
      dataIndex: "phuongThucPhanBo",
      key: "phuongThucPhanBo",
      width: 200,
      render: (v: number) => (
        <Tag color={v === 1 ? "geekblue" : "purple"}>
          {PHUONG_THUC_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    { title: "Mã vật tư", dataIndex: "maVatTu", key: "maVatTu", width: 120, render: (v) => v ?? "—" },
    { title: "Thứ tự", dataIndex: "thuTu", key: "thuTu", width: 80, align: "center" },
    {
      title: "Thao tác",
      key: "action",
      width: 110,
      align: "center",
      render: (_v, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Xác nhận xóa nhóm này?" onConfirm={() => handleDeleteNhom(row.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={String(loaiPhanBo)}
        onChange={(k) => setLoaiPhanBo(Number(k))}
        items={LOAI_PHAN_BO_TABS}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Title level={5}>Danh sách nhóm</Title>
          <Space className="mb-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm nhóm
            </Button>
            <Popconfirm
              title="Sao chép cấu hình từ ca gần nhất"
              description={
                <>
                  Tự động lấy cấu hình nhóm/NVL/% từ ca liền kề gần nhất (cùng Lò cao {idLoCao}) có dữ liệu,
                  <br />
                  gộp vào Ngày {ngay.format("DD/MM/YYYY")}, Ca {ca} hiện tại. NVL đã có sẵn sẽ được giữ
                  nguyên, không bị trùng.
                </>
              }
              okText="Sao chép"
              cancelText="Hủy"
              onConfirm={handleCopy}
            >
              <Button icon={<CopyOutlined />} loading={copyLoading}>
                Sao chép cấu hình
              </Button>
            </Popconfirm>
          </Space>
          <Table
            size="small"
            bordered
            rowKey="id"
            loading={loadingNhom}
            pagination={false}
            columns={nhomColumns}
            dataSource={nhomList}
            onRow={(row) => ({
              onClick: () => setSelectedNhom(row),
              style: { cursor: "pointer", background: selectedNhom?.id === row.id ? "#e6f4ff" : undefined },
            })}
          />
        </Col>
        <Col span={12}>
          <Title level={5}>
            NVL trong nhóm {selectedNhom ? `— ${selectedNhom.tenNhom}` : ""} (Lò cao {idLoCao}, Ngày{" "}
            {ngay.format("DD/MM/YYYY")}, Ca {ca})
          </Title>
          {selectedNhom ? (
            <NvlNhomPanel
              nhom={selectedNhom}
              nvlOptions={nvlList}
              ngay={ngay}
              ca={ca}
              idLoCao={idLoCao}
              refreshToken={refreshToken}
            />
          ) : (
            <div className="text-gray-400">Chọn 1 nhóm bên trái để quản lý NVL thành viên.</div>
          )}
        </Col>
      </Row>

      <Modal
        title={editingNhom ? "Sửa nhóm phân bổ" : "Thêm nhóm phân bổ"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmitNhom}
        confirmLoading={modalLoading}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tenNhom" label="Tên nhóm" rules={[{ required: true, message: "Nhập tên nhóm" }]}>
            <Input placeholder="VD: Quặng thiêu kết" />
          </Form.Item>
          <Form.Item name="loaiPhanBo" label="Loại phân bổ" rules={[{ required: true }]}>
            <Select
              options={LOAI_PHAN_BO_TABS.map((t) => ({ label: t.label, value: Number(t.key) }))}
              disabled={!!editingNhom}
            />
          </Form.Item>
          <Form.Item
            name="idLoCao"
            label="Lò cao áp dụng"
            rules={[{ required: true, message: "Chọn lò cao" }]}
            tooltip="Nhóm chỉ áp dụng cho đúng 1 lò cao. Nếu cần dùng chung cho nhiều lò, tạo nhiều nhóm riêng (cùng tên khác lò)."
          >
            <Select options={LO_CAO_OPTIONS} />
          </Form.Item>
          <Form.Item name="phuongThucPhanBo" label="Phương thức phân bổ" rules={[{ required: true }]}>
            <Select options={PHUONG_THUC_OPTIONS} />
          </Form.Item>
          <Form.Item name="maVatTu" label="Mã vật tư">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="thuTu" label="Thứ tự hiển thị">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Panel quản lý NVL thành viên của 1 nhóm ────────────────────────────────

interface NvlNhomPanelProps {
  nhom: NhomPhanBoDto;
  nvlOptions: LGNLNvlDto[];
  ngay: Dayjs;
  ca: number;
  idLoCao: number;
  refreshToken: number;
}

function NvlNhomPanel({ nhom, nvlOptions, ngay, ca, idLoCao, refreshToken }: NvlNhomPanelProps) {
  const [data, setData] = useState<NvlNhomPhanBoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addForm] = Form.useForm();
  const [adding, setAdding] = useState(false);
  const ngayStr = ngay.format("YYYY-MM-DD");

  const laPp2 = nhom.phuongThucPhanBo === PHUONG_THUC_TY_LE_NHAP_TAY;
  const [tyLeNhom, setTyLeNhom] = useState<number | null>(null);
  const [tyLeNhomInput, setTyLeNhomInput] = useState<number | null>(null);
  const [savingTyLeNhom, setSavingTyLeNhom] = useState(false);
  const [savingTyLeNvlId, setSavingTyLeNvlId] = useState<number | null>(null);
  const [daChot, setDaChot] = useState(false);

  // % dùng chung cho NVL ở MỌI lò cao của (Ngày, Ca) — nên phải hỏi đã chốt ở BẤT KỲ lò cao nào của
  // (Ngày, Ca), không phải riêng idLoCao đang chọn, để khớp đúng phạm vi backend thực sự chặn khi sửa %.
  const fetchDaChot = useCallback(async () => {
    try {
      const res = await tyLePhanBoApi.isCaDaChot({ ngay: ngayStr, ca });
      setDaChot(res);
    } catch {
      setDaChot(false);
    }
  }, [ngayStr, ca]);

  const fetchNvl = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nhomPhanBoApi.getNvl(nhom.id, ngayStr, ca);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải NVL của nhóm");
    } finally {
      setLoading(false);
    }
  }, [nhom.id, ngayStr, ca]);

  const fetchTyLeNhom = useCallback(async () => {
    if (!laPp2) { setTyLeNhom(null); setTyLeNhomInput(null); return; }
    try {
      const res = await nhomPhanBoApi.getTyLeNhom({ idNhomPhanBo: nhom.id, ngay: ngayStr, ca, idLoCao });
      const percent = res == null ? null : res * 100;
      setTyLeNhom(percent);
      setTyLeNhomInput(percent);
    } catch {
      message.error("Lỗi khi tải % nhóm");
    }
  }, [laPp2, nhom.id, ngayStr, ca, idLoCao]);

  useEffect(() => {
    fetchNvl();
    fetchTyLeNhom();
    fetchDaChot();
    addForm.resetFields();
  }, [fetchNvl, fetchTyLeNhom, fetchDaChot, addForm, refreshToken]);

  const handleSaveTyLeNhom = async () => {
    if (tyLeNhomInput == null) return;
    const idNguoiNhap = getCurrentUserId();
    if (!idNguoiNhap) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setSavingTyLeNhom(true);
    try {
      const res = await nhomPhanBoApi.createTyLeNhom({
        idNhomPhanBo: nhom.id,
        ngay: ngayStr,
        ca,
        idLoCao,
        tyLe: tyLeNhomInput / 100,
        idNguoiNhap,
      });
      setTyLeNhom(tyLeNhomInput);
      message.success(res.message);
      fetchNvl();
    } catch (err: any) {
      message.error(err?.message || "Lưu % nhóm thất bại.");
    } finally {
      setSavingTyLeNhom(false);
    }
  };

  // Sửa % riêng cho 1 NVL — độc lập với "Áp dụng % cho cả nhóm", vì cùng 1 nhóm có thể có
  // các NVL với tỷ lệ khác nhau (không bắt buộc phải áp dụng % chung trước mới sửa được từng NVL).
  const handleSaveTyLeNvl = async (row: NvlNhomPhanBoDto, percent: number | null) => {
    if (percent == null) return;
    const idNguoiNhap = getCurrentUserId();
    if (!idNguoiNhap) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setSavingTyLeNvlId(row.idNvl);
    try {
      await tyLePhanBoApi.create({
        idNvl: row.idNvl,
        ngay: ngayStr,
        ca,
        tyLe: percent / 100,
        idNguoiNhap,
      });
      message.success(`Đã lưu % cho ${row.tenNvl ?? `#${row.idNvl}`}.`);
      fetchNvl();
    } catch (err: any) {
      message.error(err?.message || "Lưu % thất bại.");
    } finally {
      setSavingTyLeNvlId(null);
    }
  };

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      setAdding(true);
      await nhomPhanBoApi.addNvl(nhom.id, { idNvl: values.idNvl, ngay: ngayStr, ca, idLoCao });
      message.success("Đã thêm NVL vào nhóm");
      addForm.resetFields();
      fetchNvl();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || "Lỗi khi thêm NVL vào nhóm");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (idNvl: number) => {
    try {
      await nhomPhanBoApi.removeNvl(nhom.id, idNvl, ngayStr, ca);
      message.success("Đã xóa NVL khỏi nhóm");
      fetchNvl();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi xóa NVL khỏi nhóm");
    }
  };

  const columns: ColumnsType<NvlNhomPhanBoDto> = [
    {
      title: "NVL",
      dataIndex: "tenNvl",
      key: "tenNvl",
      render: (v: string | null, row) => v ?? `#${row.idNvl}`,
    },
    ...(laPp2
      ? [
          {
            title: "% riêng NVL",
            dataIndex: "tyLe",
            key: "tyLe",
            width: 220,
            render: (v: number | null, row: NvlNhomPhanBoDto) => (
              <TyLeRiengCell
                // key đổi theo v để reset về giá trị nguồn khi nó thay đổi từ bên ngoài (cascade từ
                // "Áp dụng % cho cả nhóm" hoặc sau khi lưu riêng thành công)
                key={`${row.id}-${v ?? "empty"}`}
                initialValue={v == null ? null : v * 100}
                disabled={daChot}
                saving={savingTyLeNvlId === row.idNvl}
                onApply={(percent) => handleSaveTyLeNvl(row, percent)}
              />
            ),
          },
        ]
      : []),
    {
      title: "",
      key: "action",
      width: 60,
      align: "center",
      render: (_v, row) => (
        <Popconfirm title="Xóa NVL khỏi nhóm?" onConfirm={() => handleRemove(row.idNvl)} okText="Xóa" cancelText="Hủy">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // NVL thuộc lò cao khác (không có trong nvlOptions đang lọc theo idLoCao) sẽ không hiển thị ở đây
  const nvlIdsTrongLoCao = new Set(nvlOptions.map((n) => n.id));
  const dataTrongLoCao = data.filter((d) => nvlIdsTrongLoCao.has(d.idNvl));
  const daDungIds = new Set(data.map((d) => d.idNvl));

  return (
    <>
      {laPp2 && (
        <Space className="mb-3" align="start">
          <InputNumber
            style={{ width: 160 }}
            min={0}
            max={100}
            precision={3}
            addonAfter="%"
            placeholder="% cho cả nhóm"
            value={tyLeNhomInput}
            disabled={daChot}
            onChange={(v) => setTyLeNhomInput(v)}
          />
          <Button
            type="primary"
            loading={savingTyLeNhom}
            disabled={tyLeNhomInput == null || daChot}
            onClick={handleSaveTyLeNhom}
          >
            Áp dụng % cho cả nhóm
          </Button>
        </Space>
      )}

      <Table
        size="small"
        bordered
        rowKey="id"
        loading={loading}
        pagination={false}
        columns={columns}
        dataSource={dataTrongLoCao}
        className="mb-3"
      />

      <Form form={addForm} layout="inline">
        <Form.Item name="idNvl" rules={[{ required: true, message: "Chọn NVL" }]} style={{ flex: 1, minWidth: 220 }}>
          <Select
            showSearch
            placeholder="Chọn NVL theo tên"
            optionFilterProp="label"
            options={nvlOptions
              .filter((n) => !daDungIds.has(n.id))
              .map((n) => ({ label: n.tenNVL_NM ?? `#${n.id}`, value: n.id }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" loading={adding} onClick={handleAdd}>
            Thêm NVL
          </Button>
        </Form.Item>
      </Form>
      <div className="text-gray-400 mt-1">
        Cấu hình này chỉ áp dụng cho đúng Ngày/Ca/Lò cao đang chọn ở filter bar — đổi ngày/ca khác sẽ cần
        thêm NVL lại từ đầu, không kế thừa (dùng nút "Sao chép cấu hình" ở trên để copy nhanh từ ngày/ca
        khác). Ghi chú: với phương thức "Tỷ trọng nội bộ + dòng dư" (như nhóm Quặng thiêu kết), NVL nào
        nhận phần bù trừ (dòng dư) được <b>hệ thống tự động chọn</b> theo khối lượng nạp liệu lớn nhất mỗi
        lần tính — không cần cấu hình tay, và không dùng % nhóm.
        {laPp2 && (
          <>
            {" "}Với phương thức "Tỷ lệ nhập tay": bấm "Áp dụng % cho cả nhóm" để gán nhanh cùng 1 % cho
            mọi NVL đang có trong nhóm (NVL thêm sau đó cũng tự động lấy % này), hoặc nhập % rồi bấm nút
            "Áp dụng" ở cột "% riêng NVL" cho từng dòng — không bắt buộc phải bấm "Áp dụng % cho cả nhóm"
            trước, vì cùng 1 nhóm có thể có nhiều NVL với tỷ lệ khác nhau.
          </>
        )}
      </div>
    </>
  );
}

// Ô nhập % riêng cho 1 NVL — giữ giá trị đang gõ ở state cục bộ, chỉ gọi API khi bấm "Áp dụng"
// (hoặc Enter) thay vì lưu ngay mỗi lần blur, tránh gọi API liên tục khi người dùng di chuyển qua
// nhiều ô nhập liệu.
function TyLeRiengCell({
  initialValue,
  disabled,
  saving,
  onApply,
}: {
  initialValue: number | null;
  disabled: boolean;
  saving: boolean;
  onApply: (percent: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initialValue);

  return (
    <Space.Compact style={{ width: "100%" }}>
      <InputNumber
        style={{ width: "100%" }}
        min={0}
        max={100}
        precision={3}
        addonAfter="%"
        placeholder="Chưa nhập"
        value={value}
        disabled={disabled || saving}
        onChange={(v) => setValue(v)}
        onPressEnter={() => onApply(value)}
      />
      <Button size="small" type="primary" loading={saving} disabled={disabled || value == null} onClick={() => onApply(value)}>
        Áp dụng
      </Button>
    </Space.Compact>
  );
}
