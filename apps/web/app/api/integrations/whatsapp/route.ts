import QRCode from "qrcode";

export const dynamic = "force-dynamic";

type ConnectorState = {
  status: "idle" | "connecting" | "qr" | "connected" | "disconnected";
  qr?: string | null;
  lastError?: string | null;
  sessionDir?: string;
  sessionBackupConfigured?: boolean;
  sessionBackupFile?: string | null;
  lastSessionBackupAt?: string | null;
  lastSessionBackupError?: string | null;
  chats?: number;
  selectedChats?: number;
};

type ChatSummary = {
  id: string;
  name?: string;
  unreadCount?: number;
  updatedAt?: number;
  selected?: boolean;
};

export async function GET() {
  const baseUrl = connectorBaseUrl();
  if (!baseUrl) {
    return Response.json({ configured: false, error: "WHATSAPP_CONNECTOR_URL is not configured" });
  }

  try {
    const [health, qrState, chats] = await Promise.all([
      connectorFetch<{ whatsapp: ConnectorState }>(baseUrl, "/health"),
      connectorFetch<ConnectorState>(baseUrl, "/qr"),
      connectorFetch<{ chats: ChatSummary[] }>(baseUrl, "/chats")
    ]);

    const state = qrState.status === "idle" ? health.whatsapp : qrState;
    const qrDataUrl = state.qr ? await QRCode.toDataURL(state.qr, { margin: 1, width: 240 }) : null;

    return Response.json({ configured: true, state, qrDataUrl, chats: chats.chats });
  } catch (error) {
    return Response.json({ configured: true, error: error instanceof Error ? error.message : "connector_unavailable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const baseUrl = connectorBaseUrl();
  if (!baseUrl) {
    return Response.json({ error: "WHATSAPP_CONNECTOR_URL is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.action !== "string") {
    return Response.json({ error: "Expected { action: string }" }, { status: 400 });
  }

  try {
    if (body.action === "connect") {
      const state = await connectorFetch<ConnectorState>(baseUrl, "/connect", { method: "POST" });
      const qrDataUrl = state.qr ? await QRCode.toDataURL(state.qr, { margin: 1, width: 240 }) : null;
      return Response.json({ state, qrDataUrl });
    }

    if (body.action === "set-selected-chats" && Array.isArray(body.chatIds) && body.chatIds.every((id) => typeof id === "string")) {
      const result = await connectorFetch<{ chatIds: string[] }>(baseUrl, "/selected-chats", {
        method: "POST",
        body: JSON.stringify({ chatIds: body.chatIds })
      });
      return Response.json(result);
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "connector_unavailable" }, { status: 502 });
  }
}

function connectorBaseUrl() {
  return process.env.WHATSAPP_CONNECTOR_URL?.replace(/\/$/, "");
}

async function connectorFetch<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(process.env.WHATSAPP_CONNECTOR_TOKEN ? { authorization: `Bearer ${process.env.WHATSAPP_CONNECTOR_TOKEN}` } : {}),
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`WhatsApp connector ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
