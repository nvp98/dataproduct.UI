// import './App.css'
import GlobalLoading from './components/GlobalLoading';
import NotificationListener from './components/NotificationListener';
import RouterWrapper from "./routes/AppRoutes";
const App = () => {
  return (
  <>
    <GlobalLoading />
    <NotificationListener />
    <RouterWrapper />
  </>
  );
};

export default App
