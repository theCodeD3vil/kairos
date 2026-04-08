import type {
  IngestEventsRequest,
  IngestEventsResponse,
} from '@kairos/shared/ingestion';
import type { ExtensionHandshakeRequest, ExtensionHandshakeResponse } from '@kairos/shared/settings';

import { DESKTOP_REQUEST_TIMEOUT_MS } from './constants';
import { buildDesktopBaseURLCandidates } from './discovery';
import type { DesktopClient } from './types';

export class HTTPDesktopClient implements DesktopClient {
  private activeBaseURL?: string;

  constructor(
    private readonly preferredBaseURL?: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse> {
    return this.postJSON<ExtensionHandshakeResponse>('/v1/extension/handshake', request);
  }

  async ingestEvents(request: IngestEventsRequest): Promise<IngestEventsResponse> {
    return this.postJSON<IngestEventsResponse>('/v1/ingestion/events', request);
  }

  private async postJSON<T>(path: string, body: unknown): Promise<T> {
    let lastError: Error | undefined;
    for (const baseURL of this.resolveCandidates()) {
      const response = await this.tryPost(baseURL, path, body);
      if (!response) {
        continue;
      }
      if (!response.ok) {
        const message = await decodeErrorMessage(response);
        const error = new Error(message);
        if (response.status >= 400 && response.status < 500 && response.status !== 404) {
          this.activeBaseURL = baseURL;
          throw error;
        }
        lastError = error;
        continue;
      }

      this.activeBaseURL = baseURL;
      return (await response.json()) as T;
    }

    throw lastError ?? new Error('desktop bridge unavailable');
  }

  private resolveCandidates(): string[] {
    const candidates = buildDesktopBaseURLCandidates(this.preferredBaseURL);
    if (!this.activeBaseURL) {
      return candidates;
    }
    return [this.activeBaseURL, ...candidates.filter((candidate) => candidate !== this.activeBaseURL)];
  }

  private async tryPost(baseURL: string, path: string, body: unknown): Promise<Response | null> {
    try {
      return await this.fetchImpl(new URL(path, baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DESKTOP_REQUEST_TIMEOUT_MS),
      });
    } catch {
      return null;
    }
  }
}

async function decodeErrorMessage(response: Response): Promise<string> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const decoded = (await response.json()) as { error?: string };
    if (decoded.error) {
      message = decoded.error;
    }
  } catch {
    // Ignore malformed error bodies.
  }
  return message;
}
