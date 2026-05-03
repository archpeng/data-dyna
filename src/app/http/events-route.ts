import type { FastifyPluginAsync } from "fastify";
import {
  handlePostEvent,
  handlePostEventsBatch,
  type IngestionDependencies,
} from "../../ingestion/event-handlers.ts";

export type EventsRouteOptions = IngestionDependencies;

export const registerEventsRoutes: FastifyPluginAsync<EventsRouteOptions> = async (app, dependencies) => {
  app.post("/events", async (request, reply) => {
    const result = await handlePostEvent(request.body, dependencies);
    return reply.code(result.status).send(result);
  });

  app.post("/events/batch", async (request, reply) => {
    const result = await handlePostEventsBatch(request.body, dependencies);
    return reply.code(result.status).send(result);
  });
};
