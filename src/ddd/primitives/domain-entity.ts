import { DomainID } from './domain-id'

export abstract class DomainEntity {
  constructor(
    public readonly id?: DomainID,
    public createdAt?: Date,
    public updatedAt?: Date,
    public isDeleted?: boolean,
    public deletedAt?: Date | null,
  ) {
    this.createdAt = createdAt ?? new Date()
    this.updatedAt = updatedAt ?? new Date()
    this.isDeleted = isDeleted ?? false
    this.deletedAt = isDeleted ? deletedAt : null
    Object.freeze(this.id)
  }
}
