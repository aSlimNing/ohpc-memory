import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

it("渲染首页并显示标题", () => {
  render(
    <MemoryRouter initialEntries={["/toolchain"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText("Frontend Toolchain Lab")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /开始检测/ })).toBeInTheDocument();
});

it("导航可切换到 Todo 页", async () => {
  render(
    <MemoryRouter initialEntries={["/toolchain"]}>
      <App />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("link", { name: /Todo/ }));
  await waitFor(() => expect(screen.getByText(/zustand/)).toBeInTheDocument());
});
