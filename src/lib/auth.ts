export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  return hash === expectedHash;
}

// Global browser-compatible Base64Url helpers to avoid Node.js 'Buffer' dependency (required for Next.js Middleware)
function base64UrlEncode(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

export interface JwtPayload {
  username?: string;
  exp?: number;
  [key: string]: unknown;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_change_in_prod";
  const header = { alg: "HS256", typ: "JWT" };
  
  const enc = new TextEncoder();
  const encodedHeader = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHmacSha256(tokenInput, secret);
  
  return `${tokenInput}.${signature}`;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  const [headerStr, payloadStr, signature] = parts;
  const secret = process.env.JWT_SECRET || "default_jwt_secret_change_in_prod";
  
  try {
    // Recreate the signature and compare
    const expectedSignature = await signHmacSha256(`${headerStr}.${payloadStr}`, secret);
    if (signature !== expectedSignature) return null;
    
    // Decode the payload
    const dec = new TextDecoder();
    const payload = JSON.parse(dec.decode(base64UrlDecode(payloadStr))) as JwtPayload;
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
