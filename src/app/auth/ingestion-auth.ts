import type { IngestionCredential } from "../config/runtime-config.ts";

export type AuthenticatedIngestionCredential = Omit<IngestionCredential, "token">;

export type UnauthorizedIngestionResponse = {
  ok: false;
  status: 401;
  error: {
    code: "UNAUTHORIZED";
    message: "Unauthorized";
  };
};

export type IngestionAuthResult =
  | { ok: true; credential: AuthenticatedIngestionCredential }
  | { ok: false; response: UnauthorizedIngestionResponse };

const unauthorizedResponse: UnauthorizedIngestionResponse = {
  ok: false,
  status: 401,
  error: {
    code: "UNAUTHORIZED",
    message: "Unauthorized",
  },
};

export function authenticateIngestionRequest(
  authorizationHeader: string | string[] | undefined,
  credentials: readonly IngestionCredential[],
): IngestionAuthResult {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, response: unauthorizedResponse };
  }

  const credential = credentials.find((candidate) => candidate.token === token);
  if (!credential) {
    return { ok: false, response: unauthorizedResponse };
  }

  return { ok: true, credential: withoutToken(credential) };
}

function extractBearerToken(authorizationHeader: string | string[] | undefined): string | undefined {
  if (Array.isArray(authorizationHeader)) {
    if (authorizationHeader.length !== 1) {
      return undefined;
    }

    return extractBearerToken(authorizationHeader[0]);
  }

  const parts = authorizationHeader?.trim().split(/\s+/) ?? [];
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer" || !parts[1]) {
    return undefined;
  }

  return parts[1];
}

function withoutToken(credential: IngestionCredential): AuthenticatedIngestionCredential {
  return {
    credentialId: credential.credentialId,
    merchantId: credential.merchantId,
    storeIds: credential.storeIds,
    producer: credential.producer,
    source: credential.source,
  };
}
