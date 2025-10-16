import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { notification } from 'antd';
import type { RootState } from '../store';
import { clearNotification } from '../store/NotificationSlice';

const NotificationListener = () => {
  const dispatch = useDispatch();
  const { message, description, type } = useSelector((state: RootState) => state.notification);

  useEffect(() => {
    if (message && type) {
      notification[type]({
        message,
        description,
        placement: 'topRight',
      });

      dispatch(clearNotification()); // clear sau khi hiển thị
    }
  }, [message, type, description, dispatch]);

  return null;
};

export default NotificationListener;
