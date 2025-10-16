import { Card, Table, Button, Space, Tag, Input, Select, DatePicker, Row, Col, Typography } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const TicketProcessing = () => {
  const [loading, _setLoading] = useState(false);

  // Mock data cho bảng phiếu
  const mockData = [
    {
      key: '1',
      ticketId: 'TK001',
      customerName: 'Nguyễn Văn A',
      phone: '0123456789',
      status: 'pending',
      createDate: '2024-01-15',
      priority: 'high',
      description: 'Sửa chữa máy tính',
    },
    {
      key: '2',
      ticketId: 'TK002',
      customerName: 'Trần Thị B',
      phone: '0987654321',
      status: 'processing',
      createDate: '2024-01-16',
      priority: 'medium',
      description: 'Cài đặt phần mềm',
    },
    {
      key: '3',
      ticketId: 'TK003',
      customerName: 'Lê Văn C',
      phone: '0369852147',
      status: 'completed',
      createDate: '2024-01-17',
      priority: 'low',
      description: 'Tư vấn kỹ thuật',
    },
  ];

  const columns = [
    {
      title: 'Mã phiếu',
      dataIndex: 'ticketId',
      key: 'ticketId',
      width: 100,
    },
    {
      title: 'Tên khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'Chờ xử lý' },
          processing: { color: 'blue', text: 'Đang xử lý' },
          completed: { color: 'green', text: 'Hoàn thành' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityConfig = {
          high: { color: 'red', text: 'Cao' },
          medium: { color: 'orange', text: 'Trung bình' },
          low: { color: 'green', text: 'Thấp' },
        };
        const config = priorityConfig[priority as keyof typeof priorityConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createDate',
      key: 'createDate',
      width: 120,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small">
            Xem
          </Button>
          <Button type="link" icon={<EditOutlined />} size="small">
            Sửa
          </Button>
          <Button type="link" icon={<DeleteOutlined />} size="small" danger>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    console.log('Search:', value);
    // Implement search logic here
  };

  const handleStatusFilter = (value: string) => {
    console.log('Status filter:', value);
    // Implement status filter logic here
  };

  return (
    <div>
      <Title level={2}>Xử lý phiếu</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Tìm kiếm theo mã phiếu, tên khách hàng..."
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo trạng thái"
              style={{ width: '100%' }}
              onChange={handleStatusFilter}
              allowClear
            >
              <Option value="pending">Chờ xử lý</Option>
              <Option value="processing">Đang xử lý</Option>
              <Option value="completed">Hoàn thành</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button type="primary" style={{ width: '100%' }}>
              Tạo phiếu mới
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={mockData}
          loading={loading}
          pagination={{
            total: mockData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default TicketProcessing;

