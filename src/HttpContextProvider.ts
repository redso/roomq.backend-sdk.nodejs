export interface IHttpRequest {
  getUserAgent(): string;
  getHeader(name: string): string;
  getAbsoluteUri(): string;
  getUserHostAddress(): string;
  getCookieValue(cookieKey: string): string | null;
  getQueryValue(key: string): string | null;
}

export interface IHttpResponse {
  setCookie(
    cookieName: string,
    cookieValue: string,
    domain: string,
    expiration: Date
  ): void;
}

export interface IHttpContextProvider {
  getHttpRequest(): IHttpRequest;
  getHttpResponse(): IHttpResponse;
}
