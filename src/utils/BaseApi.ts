export class BaseApi {
  protected readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

    protected async request<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const serviceResponse = await response.json() as { success: boolean, data: T, message?: string };

      if (serviceResponse.success) {
        return serviceResponse.data as T;
      } else {
        throw new Error(serviceResponse.message || 'API request failed');
      }
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)))
        } else {
          searchParams.set(key, String(value))
        }
      }
    })
    
    return searchParams.toString()
  }
}