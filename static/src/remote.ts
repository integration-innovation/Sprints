/**
 * Talks to the Google Apps Script web app that fronts a programme's sheet.
 *
 * Requests are deliberately CORS-simple: a GET with query parameters, or a POST
 * whose body is text/plain. Apps Script cannot answer a CORS preflight, so a
 * POST sent as application/json would be blocked by the browser before it
 * reached the script.
 */
import type { SEntry, SParticipant, SProgramme, SProject, STarget } from "./model";

export type RemoteConfig = { url: string; key: string; sheetUrl?: string };

type ApiResponse = { ok: boolean; error?: string; state?: SheetState; version?: number };

/** What the sheet stores: a programme without the client-only connection fields. */
export type SheetState = Omit<SProgramme, "remote">;

export class RemoteError extends Error {}

function assertUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RemoteError("That doesn't look like a URL.");
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw new RemoteError("The web app URL must start with https://");
  }
  if (!parsed.hostname.endsWith("google.com") && !local) {
    throw new RemoteError(
      "That isn't a Google Apps Script web app URL — it should look like " +
        "https://script.google.com/macros/s/…/exec",
    );
  }
  if (!local && !parsed.pathname.endsWith("/exec")) {
    throw new RemoteError(
      "Use the deployment's /exec URL, not the /dev one. Deploy → Manage deployments → copy the Web app URL.",
    );
  }
}

async function readResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(text) as ApiResponse;
  } catch {
    // Apps Script serves an HTML sign-in page when the deployment isn't public.
    throw new RemoteError(
      "The sheet replied with a page instead of data. Re-deploy the web app with " +
        'Execute as "Me" and Who has access "Anyone".',
    );
  }
  if (!parsed.ok) throw new RemoteError(parsed.error ?? "The sheet rejected that request.");
  return parsed;
}

async function get(config: RemoteConfig, action: string): Promise<ApiResponse> {
  assertUrl(config.url);
  const url = new URL(config.url);
  url.searchParams.set("action", action);
  if (config.key) url.searchParams.set("key", config.key);

  let response: Response;
  try {
    response = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  } catch {
    throw new RemoteError("Couldn't reach the sheet. Check the URL and your connection.");
  }
  return readResponse(response);
}

async function post(config: RemoteConfig, action: string, payload: unknown): Promise<ApiResponse> {
  assertUrl(config.url);
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      redirect: "follow",
      // text/plain keeps this a "simple" request, so no preflight is sent.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload, key: config.key }),
    });
  } catch {
    throw new RemoteError("Couldn't reach the sheet. Check the URL and your connection.");
  }
  return readResponse(response);
}

export async function ping(config: RemoteConfig): Promise<void> {
  await get(config, "ping");
}

export async function fetchState(config: RemoteConfig): Promise<SheetState> {
  const response = await get(config, "state");
  if (!response.state) throw new RemoteError("The sheet returned no data.");
  return response.state;
}

/** First run: creates the tabs and writes the programme the facilitator built. */
/**
 * What the sheet is built from: the programme, plus the run sheet and ground
 * rules for its Overview tab — so the sheet quotes the app rather than keeping
 * its own copy of the same words.
 */
export type InitPayload = SheetState & {
  runSheet: { window: string; phase: string; detail: string }[];
  groundRules: { rule: string; detail: string }[];
};

export async function initSheet(config: RemoteConfig, programme: InitPayload): Promise<SheetState> {
  const response = await post(config, "init", programme);
  if (!response.state) throw new RemoteError("The sheet returned no data.");
  return response.state;
}

export function pushEntry(config: RemoteConfig, entry: SEntry) {
  return post(config, "upsertEntry", entry).then((r) => r.state);
}

export function pushParticipant(config: RemoteConfig, participant: SParticipant) {
  return post(config, "upsertParticipant", participant).then((r) => r.state);
}

export function pushProject(config: RemoteConfig, project: SProject) {
  return post(config, "upsertProject", project).then((r) => r.state);
}

export function pushTarget(config: RemoteConfig, target: STarget) {
  return post(config, "upsertTarget", target).then((r) => r.state);
}

export function pushSession(config: RemoteConfig, session: SProgramme["sessions"][number]) {
  return post(config, "upsertSession", session).then((r) => r.state);
}
