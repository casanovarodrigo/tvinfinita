import { DomainEntity } from './domain-entity'
import { DomainID } from './domain-id'

export abstract class Entity<T extends DomainEntity> {
  protected readonly _id: DomainID
  protected readonly props: T

  constructor(props: T) {
    this._id = props.id ? props.id : DomainID.create()
    this.props = props
  }

  /**
   * @returns DomainId
   */
  get id(): DomainID {
    return this._id
  }

  /**
   * @returns Date
   */
  get createdAt(): Date {
    return this.props.createdAt ?? new Date()
  }

  /**
   * @returns Date
   */
  get updatedAt(): Date {
    return this.props.updatedAt ?? new Date()
  }

  /**
   * @returns Boolean
   */
  get isDeleted(): boolean {
    return this.props.isDeleted ?? false
  }

  /**
   * @returns Date or Undefined
   */
  get deletedAt(): Date | undefined {
    return this.props.deletedAt ?? undefined
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false
    }
    if (this === object) {
      return true
    }
    if (!this.isEntity(object)) {
      return false
    }
    return this.id.equals(object.id)
  }

  public isEntity(v: any): v is Entity<any> {
    return v instanceof Entity
  }
}
