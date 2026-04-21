import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Optional: Add a Footer here if needed */}
    </div>
  );
};

export default MainLayout;
