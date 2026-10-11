import { resolve } from "node:path";

const dist = resolve(import.meta.dir, "../dist");
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4175,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) return new Response(null, { status: 404 });
    const file = Bun.file(resolve(dist, name));
    return (await file.exists()) ? new Response(file) : new Response(null, { status: 404 });
  },
});

console.log(`Serving current build at ${server.url}`);
