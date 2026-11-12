export class HttpError extends Error {
    status;
    url;
    constructor(status, message, url) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.url = url;
    }
}
//# sourceMappingURL=HttpError.js.map