export class BaseApi {
  protected readonly baseUrl: string;
  private readonly defaultTimeout: number = 30000; // 30 seconds
  private readonly maxRetries: number = 3;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  protected async request<T = unknown>(
    endpoint: string,
    options?: RequestInit & { timeout?: number; retries?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout ?? this.defaultTimeout;
    const maxRetries = options?.retries ?? this.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
          signal: controller.signal,
          ...options,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const serviceResponse = (await response.json()) as {
          success: boolean;
          data: T;
          message?: string;
        };

        if (serviceResponse.success) {
          return serviceResponse.data as T;
        } else {
          throw new Error(serviceResponse.message || "API request failed");
        }
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const isTimeoutError =
          error instanceof Error && error.name === "AbortError";

        if (isLastAttempt) {
          console.error(
            `API request failed after ${maxRetries + 1} attempts: ${url}`,
            error
          );
          throw error;
        }

        if (isTimeoutError) {
          console.warn(
            `API request timeout (attempt ${attempt + 1}/${maxRetries + 1}): ${url}`
          );
        } else {
          console.warn(
            `API request failed (attempt ${attempt + 1}/${maxRetries + 1}): ${url}`,
            error
          );
        }

        // Wait before retrying: 1s, 2s, 3s...
        await new Promise((resolve) =>
          setTimeout(resolve, (attempt + 1) * 1000)
        );
      }
    }

    // This should never be reached due to the throw in the last attempt
    throw new Error(`Unexpected error: maximum retries exceeded for ${url}`);
  }

  protected buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }
}
