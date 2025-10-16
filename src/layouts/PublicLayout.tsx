import { Outlet, Link } from "react-router-dom";

const PublicLayout = () => {
  return (
    <div>
      <header className="bg-blue-600 text-white px-6 py-4 flex justify-between">
        <div>Trang web</div>
        <nav>
          <Link className="mr-4" to="/">
            Trang chủ
          </Link>
          <Link to="/about">Giới thiệu</Link>
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
