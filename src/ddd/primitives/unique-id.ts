import { v4 as uuid } from 'uuid'
import { Identifier } from './identifier'

/**
 * UniqueID represents an Identifier of custom typing
 * @param id is optional, implementing new uuid objects as value if no ID is passed
 */
export class UniqueID extends Identifier<string | number> {
  constructor(id?: string) {
    super(id? id : uuid())
  }
}
