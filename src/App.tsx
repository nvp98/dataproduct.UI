// import './App.css'
import GlobalLoading from './components/GlobalLoading';
import NotificationListener from './components/NotificationListener';
import AuthInitializer from './components/AuthInitializer';
import RouterWrapper from "./routes/AppRoutes";
const App = () => {
  return (
  <>
    <GlobalLoading />
    <NotificationListener />
    <AuthInitializer />
    <RouterWrapper />
  </>
  );
};

export default App
