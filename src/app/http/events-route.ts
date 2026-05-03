import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  authenticateIngestionRequest,
  type AuthenticatedIngestionCredential,
} from "../auth/ingestion-auth.ts";
import type { IngestionCredential } from "../config/runtime-config.ts";
import {
  handlePostEvent,
  handlePostEventsBatch,
  type IngestionDependencies,
} from "../../ingestion/event-handlers.ts";

export type EventsRouteOptions = IngestionDependencies & {
  ingestionCredentials: IngestionCredential[];
};

export const registerEventsRoutes: FastifyPluginAsync<EventsRouteOptions> = async (app, dependencies) => {
  app.post("/events", async (request, reply) => {
    const authorized = requireAuthorizedIngestion(request, reply, dependencies.ingestionCredentials);
    if (!authorized) {
      return reply;
    }

    const result = await handlePostEvent(request.body, dependencies, authorized);
    return reply.code(result.status).send(result);
  });

  app.post("/events/batch", async (request, reply) => {
    const authorized = requireAuthorizedIngestion(request, reply, dependencies.ingestionCredentials);
    if (!authorized) {
      return reply;
    }

    const result = await handlePostEventsBatch(request.body, dependencies, authorized);
    return reply.code(result.status).send(result);
  });
};

function requireAuthorizedIngestion(
  request: FastifyRequest,
  reply: FastifyReply,
  ingestionCredentials: IngestionCredential[],
): AuthenticatedIngestionCredential | undefined {
  const auth = authenticateIngestionRequest(request.headers.authorization, ingestionCredentials);
  if (auth.ok) {
    return auth.credential;
  }

  reply.header("WWW-Authenticate", "Bearer").code(auth.response.status).send(auth.response);
  return undefined;
}
