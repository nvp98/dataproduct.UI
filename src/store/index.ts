import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import notificationReducer from "./NotificationSlice";
import loadingReducer from "./loadingSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notification: notificationReducer,
    loading: loadingReducer,
  },
});

// Kiểu dữ liệu cho useSelector & useDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
