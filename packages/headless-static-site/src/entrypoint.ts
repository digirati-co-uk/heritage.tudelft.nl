#!/usr/bin/env bun
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Command } from "commander";
import server from "./server";

const program = new Command();

program
  //
  .option("--no-cache", "Disable caching")
  .option("--debug", "Debug building")
  .parse(process.argv);

const options = program.opts();

const { app, emitter } = server._extra;

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: app });

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen: (evt, ws) => {
        emitter.on("*", (event, data) => {
          ws.send(event);
        });
      },
      onError: (evt, ws) => {
        console.log("WebSocket error", evt);
      },
    };
  })
);

console.log(`Server running: http://localhost:${server.port}`);
const runningServer = serve(server);
injectWebSocket(runningServer);

try {
  // @todo make this optional?
  await server.request(`/build?cache=${options.cache ? "true" : "false"}&emit=true`);
  await server.request("/watch");
} catch (error) {
  console.error(error);
}
