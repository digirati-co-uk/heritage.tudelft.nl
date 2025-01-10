#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import server from "./server";

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

// @todo make this optional?
await server.request("/build?cache=true&emit=true");
await server.request("/watch");
