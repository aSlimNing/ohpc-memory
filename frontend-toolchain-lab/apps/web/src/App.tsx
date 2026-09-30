import { Route, Routes } from "react-router-dom";
import ToolchainPage from "./features/toolchain/ToolchainPage";
import TodosPage from "./features/todos/TodosPage";
import { Nav } from "./components/Nav";

export default function App() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Frontend Toolchain Lab
        </h1>
        <p className="text-sm text-gray-500">
          运行环境: {import.meta.env.MODE} · v{__APP_VERSION__}
        </p>
      </header>
      <Nav />
      <Routes>
        <Route path="/" element={<ToolchainPage />} />
        <Route path="/toolchain" element={<ToolchainPage />} />
        <Route path="/todos" element={<TodosPage />} />
      </Routes>
    </div>
  );
}
