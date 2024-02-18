import { UniqueID } from './unique-id'
import { ValueObject } from './value-object'

/**
 * @param id UniqueID
 *
 * @description param is optional
 * if not provided will generate a new one uuid
 */
export class DomainID extends ValueObject<any> {
  public readonly isNew: boolean
  private constructor(props: UniqueID, isNew: boolean) {
    super(props)
    this.isNew = isNew
  }

  /**
   * return UniqueId as string
   * @readonly
   * @type {string}
   * @memberof DomainId
   */
  get value(): string {
    return new UniqueID(this.props.value).string
  }

  /**
   * return uuid object
   *
   * @readonly
   * @type {(string | number)}
   * @memberof DomainId
   */
  get rawValue(): string | number {
    return new UniqueID(this.props.value).rawValue
  }

  /**
   * @returns UniqueID
   */
  get UniqueIDInstance(): UniqueID {
    return new UniqueID(this.props.value)
  }

  /**
   * @param id string (for already existant entities)
   * @description param is optional
   * if not provided will generate a new one uuid
   */
  public static create(id?: string): DomainID {
    const doesIdExists = id !== undefined && id !== null
    return new DomainID(new UniqueID(id), !doesIdExists)
  }
}
