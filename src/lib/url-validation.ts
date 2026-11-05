import net from "net";
import dns from "dns/promises";
import http from "http";
import https from "https";

/**
 * Validates whether an IP address belongs to a safe public range.
 * Rejects loopback, private, link-local, carrier-grade NAT, multicast, and reserved addresses.
 */
export function isSafeIpAddress(ip: string): boolean {
  const ipType = net.isIP(ip);
  if (ipType === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false;
    const [b0, b1] = parts;
    if (b0 === 0) return false; // 0.0.0.0/8 (Current network)
    if (b0 === 127) return false; // 127.0.0.0/8 (Loopback)
    if (b0 === 10) return false; // 10.0.0.0/8 (Private RFC 1918)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return false; // 172.16.0.0/12 (Private RFC 1918)
    if (b0 === 192 && b1 === 168) return false; // 192.168.0.0/16 (Private RFC 1918)
    if (b0 === 169 && b1 === 254) return false; // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return false; // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 >= 224) return false; // Multicast & Reserved (224.0.0.0/4)
    return true;
  } else if (ipType === 6) {
    if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return false; // Loopback
    if (ip === "::" || ip === "0:0:0:0:0:0:0:0") return false; // Unspecified
    if (/^fe[89ab]/i.test(ip)) return false; // Link-local
    if (/^f[cd]/i.test(ip)) return false; // Unique local (fc00::/7)
    if (ip.startsWith("::ffff:")) {
      const mapped = ip.replace("::ffff:", "");
      return isSafeIpAddress(mapped);
    }
    return true;
  }
  return false;
}

/**
 * Validates that a deployment URL uses standard web protocols (HTTP/HTTPS)
 * and does not point to internal, link-local, loopback, private network, or cloud metadata addresses.
 */
export function isSafePublicUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    let host = parsed.hostname.toLowerCase();
    if (!host) return false;

    // Strip brackets from IPv6 hostnames (e.g. "[::1]" -> "::1")
    if (host.startsWith("[") && host.endsWith("]")) {
      host = host.slice(1, -1);
    }

    // Reject localhost, local, internal, and cloud metadata hostnames
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "local" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "metadata.google.internal" ||
      host === "instance-data"
    ) {
      return false;
    }

    // IP validation
    if (net.isIP(host)) {
      return isSafeIpAddress(host);
    } else {
      // Hostnames must contain at least one dot to prevent resolving bare local network hostnames (e.g., http://router)
      if (!host.includes(".")) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export interface SafePingResult {
  ok: boolean;
  status: number;
  isRedirect: boolean;
  timeMs: number;
  bodySnippet?: string;
  error?: string;
}

/**
 * Performs a secure HTTP(S) GET request with DNS resolution pre-check and IP pinning.
 * Ensures the connection is physically established to the validated public IP, preventing DNS rebinding.
 * Does not follow redirects automatically, preventing redirect-based SSRF into private networks.
 */
export async function safePingUrl(urlString: string, timeoutMs = 5000): Promise<SafePingResult> {
  const start = Date.now();
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Protocol must be HTTP or HTTPS" };
  }

  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }

  // Reject local and cloud metadata hostnames
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "local" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "instance-data"
  ) {
    return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Target host is not permitted" };
  }

  // Resolve DNS to obtain and validate all IP addresses (preventing DNS rebinding)
  let targetIp = host;
  if (!net.isIP(host)) {
    if (!host.includes(".")) {
      return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Domain name must contain at least one dot" };
    }
    try {
      const records = await dns.lookup(host, { all: true });
      if (!records || records.length === 0) {
        return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "DNS resolution returned no records" };
      }
      // Check ALL resolved records: if ANY address is internal/private, reject immediately!
      for (const rec of records) {
        if (!isSafeIpAddress(rec.address)) {
          return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Target domain resolved to a private or restricted network address" };
        }
      }
      targetIp = records[0].address;
    } catch (e: any) {
      return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: `DNS lookup failed: ${e.message}` };
    }
  } else {
    if (!isSafeIpAddress(host)) {
      return { ok: false, status: 0, isRedirect: false, timeMs: 0, error: "Target IP belongs to a private or restricted network address" };
    }
  }

  // Outbound connection with IP pinning
  return new Promise((resolve) => {
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;
    const port = parsed.port ? parseInt(parsed.port, 10) : isHttps ? 443 : 80;

    const req = client.request(
      {
        host: targetIp, // PINNED IP: connection goes directly to this IP without re-resolving
        port: port,
        path: parsed.pathname + (parsed.search || ""),
        method: "GET",
        servername: net.isIP(host) ? undefined : host, // SNI verification
        headers: {
          Host: host + (parsed.port ? `:${parsed.port}` : ""),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; HackArena/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          if (data.length < 10000) data += chunk.toString();
        });
        res.on("end", () => {
          const timeMs = Date.now() - start;
          const status = res.statusCode || 0;
          const isRedirect = status >= 300 && status < 400;
          const ok = (status >= 200 && status < 400);

          resolve({
            ok,
            status,
            isRedirect,
            timeMs,
            bodySnippet: data.slice(0, 1000),
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 408, isRedirect: false, timeMs: Date.now() - start, error: "Connection timed out" });
    });

    req.on("error", (err) => {
      resolve({ ok: false, status: 0, isRedirect: false, timeMs: Date.now() - start, error: err.message });
    });

    req.end();
  });
}
