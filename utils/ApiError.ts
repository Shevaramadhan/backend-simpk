export default class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
  }
}
