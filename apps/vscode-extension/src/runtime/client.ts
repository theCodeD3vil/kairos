import type {
  IngestEventsRequest,
  IngestEventsResponse,
} from '@kairos/shared/ingestion';
import type { ExtensionHandshakeRequest, ExtensionHandshakeResponse } from '@kairos/shared/settings';

import { DESKTOP_BASE_URL } from './constants';
import type { DesktopClient } from './types';

export class HTTPDesktopClient implements DesktopClient {
  constructor(private readonly baseURL: string = DESKTOP_BASE_URL) {}

  async handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse> {
    return this.postJSON<ExtensionHandshakeResponse>('/v1/extension/handshake', request);
  }

  async ingestEvents(request: IngestEventsRequest): Promise<IngestEventsResponse> {
    return this.postJSON<IngestEventsResponse>('/v1/ingestion/events', request);
  }

  private async postJSON<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(path, this.baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const decoded = (await response.json()) as { error?: string };
        if (decoded.error) {
          message = decoded.error;
        }
      } catch {
        // Ignore malformed error bodies.
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }
}
