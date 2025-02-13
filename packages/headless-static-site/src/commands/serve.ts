import { serve } from "@hono/node-server";
import app from "../server";

type ServeOptions = {
  build?: boolean;
  watch?: boolean;
};

export async function serveCommand(options: ServeOptions) {
  console.log("Building initial assets...");

  if (options.build) {
    await app.request("/build?cache=true&emit=true&ui=true");
  }
  if (options.watch) {
    await app.request("/watch");
  }

  console.log(`Server running: http://localhost:${app.port}`);
  serve(app);
}
