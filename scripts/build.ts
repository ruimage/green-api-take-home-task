import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const outdir = resolve(projectRoot, "dist");
if (dirname(outdir) !== projectRoot || basename(outdir) !== "dist") {
  throw new Error("Build output must be the project's dist directory");
}
await rm(outdir, { recursive: true, force: true });

const stylesheet = "./src/widgets/chat-widget/ui/launcher/widget-launcher.css";
const critical = await Bun.build({
  entrypoints: [resolve(projectRoot, stylesheet)],
  target: "browser",
  minify: true,
  env: "disable",
});
if (!critical.success || critical.outputs.length !== 1) {
  throw new AggregateError(critical.logs, "Critical CSS build failed");
}
const criticalCss = await critical.outputs[0]!.text();

const result = await Bun.build({
  entrypoints: [resolve(projectRoot, "index.html")],
  target: "browser",
  format: "esm",
  splitting: true,
  minify: true,
  env: "disable",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  outdir,
  naming: {
    entry: "[name]-[hash].[ext]",
    chunk: "chunk-[hash].[ext]",
    asset: "[name]-[hash].[ext]",
  },
  plugins: [
    {
      name: "inline-critical-css",
      setup(build) {
        build.onLoad({ filter: /[\\/]index\.html$/ }, async ({ path }) => {
          if (resolve(path) !== resolve(projectRoot, "index.html")) return;
          let matches = 0;
          const contents = new HTMLRewriter()
            .on("link[data-critical]", {
              element(element) {
                if (
                  element.getAttribute("rel") !== "stylesheet" ||
                  element.getAttribute("href") !== stylesheet
                ) {
                  throw new Error("Unexpected critical stylesheet");
                }
                matches += 1;
                element.replace(
                  `<style data-critical>${criticalCss.replace(/<\/style/gi, "<\\/style")}</style>`,
                  { html: true },
                );
              },
            })
            .transform(await Bun.file(path).text());
          if (matches !== 1) throw new Error("Expected one critical stylesheet");
          return { contents, loader: "html" };
        });
      },
    },
  ],
});
if (!result.success) throw new AggregateError(result.logs, "Production build failed");
const html = result.outputs.find((output) => output.path.endsWith(".html"));
if (!html) throw new Error("Missing HTML entrypoint");
await Bun.write(resolve(outdir, "index.html"), await html.text());
if (resolve(html.path) !== resolve(outdir, "index.html")) await rm(html.path);

for (const output of result.outputs.filter((artifact) => !artifact.path.endsWith(".html"))) {
  console.log(`${basename(output.path)}: ${(output.size / 1024).toFixed(2)} KiB`);
}
console.log(`Critical CSS inline: ${(Buffer.byteLength(criticalCss) / 1024).toFixed(2)} KiB`);
