/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tabs, Tag, Typography, message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import {
  nhomPhanBoApi,
  type NhomPhanBoDto,
  type NvlNhomPhanBoDto,
} from "../../../../services/PhanBoApi";
import { lgnlNvlApi, type LGNLNvlDto } from "../../../../services/LGNLApi";

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

  const fetchNhom = useCallback(async () => {
    setLoadingNhom(true);
    try {
      const res = await nhomPhanBoApi.getList(loaiPhanBo);
      setNhomList(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách nhóm phân bổ");
    } finally {
      setLoadingNhom(false);
    }
  }, [loaiPhanBo]);

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
    form.setFieldsValue({ loaiPhanBo, phuongThucPhanBo: 1 });
    setEditingNhom(null);
    setModalOpen(true);
  };

  const openEdit = (row: NhomPhanBoDto) => {
    form.setFieldsValue({
      tenNhom: row.tenNhom,
      loaiPhanBo: row.loaiPhanBo,
      phuongThucPhanBo: row.phuongThucPhanBo,
      thuTu: row.thuTu,
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
            <NvlNhomPanel nhom={selectedNhom} nvlOptions={nvlList} ngay={ngay} ca={ca} idLoCao={idLoCao} />
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
          <Form.Item name="phuongThucPhanBo" label="Phương thức phân bổ" rules={[{ required: true }]}>
            <Select options={PHUONG_THUC_OPTIONS} />
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
}

function NvlNhomPanel({ nhom, nvlOptions, ngay, ca, idLoCao }: NvlNhomPanelProps) {
  const [data, setData] = useState<NvlNhomPhanBoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addForm] = Form.useForm();
  const [adding, setAdding] = useState(false);
  const ngayStr = ngay.format("YYYY-MM-DD");

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

  useEffect(() => {
    fetchNvl();
    addForm.resetFields();
  }, [fetchNvl, addForm]);

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
        thêm NVL lại từ đầu, không kế thừa. Ghi chú: với phương thức "Tỷ trọng nội bộ + dòng dư", NVL nào
        nhận phần bù trừ (dòng dư) được <b>hệ thống tự động chọn</b> theo khối lượng nạp liệu lớn nhất mỗi
        lần tính — không cần cấu hình tay ở đây.
      </div>
    </>
  );
}
