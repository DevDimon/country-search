export class HttpError extends Error {
  readonly status: number;
  readonly url: string | undefined;

  constructor(status: number, message: string, url?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}
