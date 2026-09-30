import http from "node:http";

const PORT = Number(process.env.PORT ?? 8788);

const tasks = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, title: `任务 ${i + 1}`, completed: i % 2 === 0 }));

const cors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-lab-client");
};

const server = http.createServer((req, res) => {
  cors(res);
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (url.pathname === "/api/tasks") {
    const limit = Number(url.searchParams.get("_limit") ?? 5);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(tasks.slice(0, limit)));
    return;
  }
  if (url.pathname === "/api/echo" && req.method === "POST") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ got: body, client: req.headers["x-lab-client"] ?? null }));
    });
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found", path: url.pathname }));
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock api on http://127.0.0.1:${PORT}/api/tasks`));
