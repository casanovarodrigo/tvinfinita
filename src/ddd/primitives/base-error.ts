interface IBaseError {
  message: string
}
export class BaseError extends Error implements IBaseError {
  constructor(message?: string, name?: string) {
    let msg = `No message specified for error: ${name}`
    if (message) msg = message

    super(msg)

    if (name) this.name = name
  }
}
