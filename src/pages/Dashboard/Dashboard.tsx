import { Card, Row, Col, Statistic, Typography } from 'antd';
import { UserOutlined, ShoppingCartOutlined, DollarOutlined, BarChartOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div>
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đơn hàng"
              value={93}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Doanh thu"
              value={112893}
              prefix={<DollarOutlined />}
              suffix="đ"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tăng trưởng"
              value={11.28}
              prefix={<BarChartOutlined />}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Biểu đồ doanh thu" size="small">
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              Biểu đồ doanh thu sẽ được hiển thị ở đây
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thống kê đơn hàng" size="small">
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              Biểu đồ đơn hàng sẽ được hiển thị ở đây
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

