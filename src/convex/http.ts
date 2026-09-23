import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { health } from "./webhooks";

const http = httpRouter();

auth.addHttpRoutes(http);
http.route({
  path: "/.well-known/foodlink",
  method: "GET",
  handler: health,
});

export default http;
