import { v4 as uuid } from 'uuid'

export class Identifier<T> {
  private value: T

  constructor(value: T) {
    this.value = value
  }

  /**
   * return Identifier as a string
   * @readonly
   * @memberof Identifier
   */
  get string(): string {
    return String(this.value)
  }

  /**
   * return Identifier as raw object
   * possibly the same as string if the raw value is a string
   * @readonly
   * @memberof Identifier
   */
  get rawValue(): string | number | uuid {
    return this.value
  }

  /**
   * Compares if current Identifier and target ones are the same
   * @param id Identifier to be compared
   * @returns boolean
   */
  equals(id?: Identifier<T>): boolean {
    if (id === null || id === undefined) {
      return false
    }
    if (!(id instanceof this.constructor)) {
      return false
    }
    return id.rawValue === this.rawValue
  }
}
