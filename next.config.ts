import type { NextConfig } from "next";

/**
 * GitHub Pages serves a project site under /<repository>/. The workflow passes
 * that prefix as BASE_PATH; locally and in tests it is empty.
 */
const basePath = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default config;
