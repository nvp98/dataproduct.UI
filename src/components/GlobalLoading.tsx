import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import type { RootState } from '../store';

const GlobalLoading = () => {
  const isLoading = useSelector((state: RootState) => state.loading.global);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      style={{ pointerEvents: 'none' }} // giúp modal không block tương tác nếu cần
    >
      <div
        className="bg-white rounded-md px-6 py-4 shadow-xl flex flex-col items-center justify-center"
        style={{ pointerEvents: 'auto' }} // modal vẫn bắt sự kiện
      >
        <Spin size="large" fullscreen tip="Đang xử lý..." />
      </div>
    </div>
  );
};

export default GlobalLoading;
