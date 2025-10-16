import { Card, Row, Col, Typography, DatePicker, Button, Select, Table, Space } from 'antd';
import { DownloadOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Reports = () => {
  // Mock data cho báo cáo
  const reportData = [
    {
      key: '1',
      reportName: 'Báo cáo doanh thu tháng',
      type: 'Revenue',
      period: '2024-01',
      status: 'Completed',
      createdDate: '2024-01-31',
    },
    {
      key: '2',
      reportName: 'Báo cáo khách hàng',
      type: 'Customer',
      period: '2024-01',
      status: 'Completed',
      createdDate: '2024-01-30',
    },
    {
      key: '3',
      reportName: 'Báo cáo sản phẩm',
      type: 'Product',
      period: '2024-01',
      status: 'Processing',
      createdDate: '2024-01-29',
    },
  ];

  const columns = [
    {
      title: 'Tên báo cáo',
      dataIndex: 'reportName',
      key: 'reportName',
    },
    {
      title: 'Loại báo cáo',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Kỳ báo cáo',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ color: status === 'Completed' ? 'green' : 'orange' }}>
          {status}
        </span>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<DownloadOutlined />} size="small">
            Tải xuống
          </Button>
          <Button type="link" icon={<PrinterOutlined />} size="small">
            In
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Báo cáo</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <RangePicker style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select placeholder="Loại báo cáo" style={{ width: '100%' }} allowClear>
              <Option value="revenue">Doanh thu</Option>
              <Option value="customer">Khách hàng</Option>
              <Option value="product">Sản phẩm</Option>
              <Option value="order">Đơn hàng</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Button type="primary" icon={<FileExcelOutlined />} style={{ width: '100%' }}>
              Tạo báo cáo
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>12</div>
              <div>Báo cáo đã tạo</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>8</div>
              <div>Báo cáo hoàn thành</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>3</div>
              <div>Đang xử lý</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>1</div>
              <div>Lỗi</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách báo cáo">
        <Table
          columns={columns}
          dataSource={reportData}
          pagination={{
            total: reportData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} báo cáo`,
          }}
        />
      </Card>
    </div>
  );
};

export default Reports;

