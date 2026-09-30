addEventListener("message", (e: MessageEvent) => {
  postMessage({ echo: e.data, from: "worker" });
});
