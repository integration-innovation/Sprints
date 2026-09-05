/**
 * Writing the use case archive to a private GitHub repository.
 *
 * This is the sibling of the Google Sheets client: same job — get the record
 * out of one browser and somewhere durable — with a different set of trade-offs.
 * A sheet needs a script deployed as "anyone with the link"; a private repo
 * needs a token. The token is the honest cost, and the interface says so rather
 * than burying it.
 *
 * Only the Contents API is used, so a fine-grained token scoped to one
 * repository with *Contents: read and write* is enough. Nothing here needs, or
 * will work with, anything broader — and the narrower the token, the less a lost
 * phone costs.
 *
 * Requests go to api.github.com, which answers CORS preflights, so this works
 * unchanged from a browser and from Node.
 */

const API = "https://api.github.com";

export type ArchiveConfig = {
  owner: string;
  repo: string;
  branch: string;
  /** Directory the archive files live in, without leading or trailing slashes. */
  dir: string;
  token: string;
};

export class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

export function assertConfig(config: ArchiveConfig): void {
  if (!OWNER.test(config.owner)) {
    throw new GitHubError("That owner name isn't a GitHub user or organisation.");
  }
  if (!REPO.test(config.repo)) {
    throw new GitHubError("That repository name isn't valid. Use the name alone, not the full URL.");
  }
  if (!config.branch.trim() || /\s/.test(config.branch)) {
    throw new GitHubError("Branch names can't be blank or contain spaces.");
  }
  if (config.dir.startsWith("/") || config.dir.includes("..")) {
    throw new GitHubError("The folder must be a path inside the repository, like `use-cases`.");
  }
  if (!config.token.trim()) {
    throw new GitHubError("A token is needed to write to a private repository.");
  }
}

/**
 * Pulls owner and repo out of whatever someone pastes.
 *
 * People paste the browser URL, the clone URL, or type `owner/repo`. All three
 * mean the same thing, and rejecting two of them teaches nothing.
 */
export function parseRepoRef(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const url = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  const pair = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  const found = url ?? pair;
  if (!found) return null;
  const [, owner, repo] = found;
  return OWNER.test(owner) && REPO.test(repo) ? { owner, repo } : null;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  // Chunked: spreading a whole file into String.fromCharCode blows the argument
  // limit somewhere around a hundred thousand characters.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToUtf8(encoded: string): string {
  const binary = atob(encoded.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

type GitHubBody = { message?: string; content?: string; sha?: string; private?: boolean; permissions?: { push?: boolean } };

/**
 * Turns an HTTP status into something a person can act on.
 *
 * GitHub returns 404 both for a repository that does not exist and for one the
 * token cannot see, deliberately — so the message has to name both rather than
 * assert the wrong one and send someone hunting for a typo that isn't there.
 */
function explain(status: number, body: GitHubBody, what: string): GitHubError {
  if (status === 401) {
    return new GitHubError("GitHub rejected the token. It may be expired, revoked, or mistyped.", status);
  }
  if (status === 403) {
    return new GitHubError(
      "GitHub refused. The token is probably missing Contents: read and write for this repository — " +
        "or you have hit a rate limit and should wait a minute.",
      status,
    );
  }
  if (status === 404) {
    return new GitHubError(
      `Couldn't find ${what}. Either it doesn't exist, or this token isn't allowed to see it — ` +
        "a fine-grained token only reaches the repositories it was granted.",
      status,
    );
  }
  if (status === 409) {
    return new GitHubError("The file changed in GitHub since this was read. Push again to pick up the newer version.", status);
  }
  if (status === 422) {
    return new GitHubError(
      body.message ? `GitHub wouldn't accept that: ${body.message}` : "GitHub wouldn't accept that write.",
      status,
    );
  }
  return new GitHubError(body.message ? `GitHub said: ${body.message}` : `GitHub returned ${status}.`, status);
}

async function call(
  config: ArchiveConfig,
  path: string,
  init: RequestInit,
  what: string,
): Promise<{ status: number; body: GitHubBody }> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new GitHubError("Couldn't reach GitHub. Check your connection.");
  }

  const text = await response.text();
  let body: GitHubBody = {};
  try {
    body = text ? (JSON.parse(text) as GitHubBody) : {};
  } catch {
    body = {};
  }
  if (!response.ok && response.status !== 404) throw explain(response.status, body, what);
  return { status: response.status, body };
}

export type RepoFacts = { private: boolean; canWrite: boolean };

/**
 * Checks the repository before anything is written to it.
 *
 * The private flag is not curiosity. Participants consent to a *private*
 * archive; pushing their words into a public repository would breach the
 * sentence they agreed to, silently and irreversibly. The caller is expected to
 * refuse on `private: false`, so this has to be knowable before the first write.
 */
export async function inspectRepo(config: ArchiveConfig): Promise<RepoFacts> {
  assertConfig(config);
  const { status, body } = await call(
    config,
    `/repos/${config.owner}/${config.repo}`,
    { method: "GET" },
    `${config.owner}/${config.repo}`,
  );
  if (status === 404) throw explain(404, body, `${config.owner}/${config.repo}`);
  return { private: body.private === true, canWrite: body.permissions?.push !== false };
}

export type RemoteFile = { text: string; sha: string };

/** Reads one file, or null when it isn't there yet — which is the normal first run. */
export async function readFile(config: ArchiveConfig, name: string): Promise<RemoteFile | null> {
  const path = filePath(config, name);
  const { status, body } = await call(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(config.branch)}`,
    { method: "GET" },
    `${path} on branch ${config.branch}`,
  );
  if (status === 404) return null;
  if (typeof body.content !== "string" || typeof body.sha !== "string") {
    throw new GitHubError(`${path} is there but isn't a text file this can read.`);
  }
  return { text: base64ToUtf8(body.content), sha: body.sha };
}

/** Creates or replaces one file. `sha` must be the one just read, or GitHub refuses. */
export async function writeFile(
  config: ArchiveConfig,
  name: string,
  contents: string,
  sha: string | undefined,
  message: string,
): Promise<void> {
  const path = filePath(config, name);
  await call(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURI(path)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: utf8ToBase64(contents),
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    },
    path,
  );
}

export function filePath(config: ArchiveConfig, name: string): string {
  const dir = config.dir.replace(/^\/+|\/+$/g, "");
  return dir ? `${dir}/${name}` : name;
}

/** The repository's own page, for a link people can actually click. */
export function repoUrl(config: ArchiveConfig): string {
  const dir = config.dir.replace(/^\/+|\/+$/g, "");
  const base = `https://github.com/${config.owner}/${config.repo}`;
  return dir ? `${base}/tree/${config.branch}/${dir}` : base;
}
