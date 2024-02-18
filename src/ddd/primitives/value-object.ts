interface ValueObjectProps {
  [index: string]: any
}

/**
 * @desc ValueObjects are not permanent objects
 */
export abstract class ValueObject<T extends ValueObjectProps> {
  protected readonly props: T

  constructor(props: T) {
    this.props = props
  }

  get value(): any {
    return this.props.value
  }

  public equals(valueObject?: ValueObject<T>): boolean {
    if (valueObject === null || valueObject === undefined) {
      return false
    }
    if (valueObject.props === undefined) {
      return false
    }
    return JSON.stringify(this.props) === JSON.stringify(valueObject.props)
  }
}
