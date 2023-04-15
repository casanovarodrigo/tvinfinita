interface IBaseError {
  message: string
}
export class BaseError extends Error implements IBaseError {
  constructor(name: string, message?: string) {
    let msg = `No message specified for error: ${name}`
    if (message){
      msg = message
    }
    super(msg)
    this.name = name
  }
}