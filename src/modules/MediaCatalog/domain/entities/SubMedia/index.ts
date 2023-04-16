import { BaseError } from "#ddd/primitives/base-error"
import { TitleValueObject } from "#modules/MediaCatalog/domain/value-objects/title"
import { FileNameValueObject } from "#modules/MediaCatalog/domain/value-objects/fileName"
import { FileExtensionValueObject } from "#modules/MediaCatalog/domain/value-objects/fileExtension"
import { ISubMediaDTO } from "./interfaces"
import { Result } from "#ddd/result"
import { Entity } from "#ddd/primitives/entity"
import { DomainEntity } from "#ddd/primitives/domain-entity"
import { UniqueID } from "#ddd/primitives/unique-id"
import { DomainID } from "#ddd/primitives/domain-id"

interface ISubMediaProps extends DomainEntity {
  fileName: FileNameValueObject,
  filePath: string,
  mediaName: TitleValueObject,
  fileExtension: FileExtensionValueObject
}

export class SubMedia extends Entity<ISubMediaProps> {

	private constructor(props: ISubMediaProps) {
    super(props)
    // Object.freeze(this)
  }

	static create(SubMediaData: ISubMediaDTO): Result<SubMedia> {
    const mediaNameOrError = TitleValueObject.create(SubMediaData.mediaName)
    const fileNameOrError = FileNameValueObject.create(SubMediaData.fileName)
    const fileExtensionOrError = FileNameValueObject.create(SubMediaData.fileExtension)

    const combinedResult = Result.combine([
      mediaNameOrError,
      fileNameOrError,
      fileExtensionOrError
    ])
    
    if (combinedResult.isFailure){
      throw new BaseError(combinedResult.error.message)
    }

    const id: DomainID = DomainID.create(SubMediaData.id)
    const fileName: FileNameValueObject = fileNameOrError.result
    const mediaName: TitleValueObject = mediaNameOrError.result
    const filePath: string = SubMediaData.filePath
    const fileExtension: FileExtensionValueObject = fileExtensionOrError.result

    return Result.ok(new SubMedia({id, fileName, filePath, mediaName, fileExtension}))
  }

  get DTO(): ISubMediaDTO {
    return {
      id: this.id.value,
      fileName: this.props.fileName.value,
      mediaName: this.props.mediaName.value,
      fileExtension: this.props.fileExtension.value,
      filePath: this.props.filePath
    }
  } 
}