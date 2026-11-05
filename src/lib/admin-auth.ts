import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to equalize execution time on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export type AdminAuthResult =
  | { authorized: true; response?: never }
  | { authorized: false; response: NextResponse };

/**
 * Validates whether the incoming Request has valid Admin HTTP Basic Authentication credentials.
 * Fails closed if ADMIN_USER or ADMIN_PASS are not configured in environment variables.
 */
export function verifyAdminAuth(request: Request): AdminAuthResult {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  // Fail closed if server credentials are not configured
  if (!adminUser || !adminPass) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
          },
        }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
          },
        }
      ),
    };
  }

  try {
    const base64Credentials = authHeader.slice(6).trim();
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const colonIndex = credentials.indexOf(":");

    if (colonIndex === -1) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          {
            status: 401,
            headers: {
              "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
            },
          }
        ),
      };
    }

    const username = credentials.substring(0, colonIndex);
    const password = credentials.substring(colonIndex + 1);

    if (safeCompare(username, adminUser) && safeCompare(password, adminPass)) {
      return { authorized: true };
    }
  } catch {
    // Malformed base64 or decoding error
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
        },
      }
    ),
  };
}
