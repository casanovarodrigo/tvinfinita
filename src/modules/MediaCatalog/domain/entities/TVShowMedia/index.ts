import { BaseError } from '#ddd/primitives/base-error'
import { TitleValueObject } from '#mediaCatalog/domain/value-objects/title'
import { FileNameValueObject } from '#mediaCatalog/domain/value-objects/fileName'
import { FileExtensionValueObject } from '#mediaCatalog/domain/value-objects/fileExtension'
import { ITVShowMediaDTO } from './interfaces'
import { Result } from '#ddd/result'
import { Entity } from '#ddd/primitives/entity'
import { DomainEntity } from '#ddd/primitives/domain-entity'
import { DomainID } from '#ddd/primitives/domain-id'
import { FilePathValueObject } from '#mediaCatalog/domain/value-objects/filePath'
import { MediaTypeValueObject } from '#mediaCatalog/domain/value-objects/mediaType'

interface ITVShowMedia extends DomainEntity {
  fileName: FileNameValueObject
  filePath: FilePathValueObject
  mediaName: TitleValueObject
  fileExtension: FileExtensionValueObject
  mediaType: MediaTypeValueObject
}

export class TVShowMedia extends Entity<ITVShowMedia> {
  private constructor(props: ITVShowMedia) {
    super(props)
    // Object.freeze(this)
  }

  static create(SubMediaData: ITVShowMediaDTO): Result<TVShowMedia> {
    const mediaNameOrError = TitleValueObject.create(SubMediaData.mediaName)
    const fileNameOrError = FileNameValueObject.create(SubMediaData.fileName)
    const fileExtensionOrError = FileNameValueObject.create(SubMediaData.fileExtension)
    const filePathOrError = FilePathValueObject.create(SubMediaData.filePath)
    const mediaTypeOrError = FileNameValueObject.create(SubMediaData.mediaType || 'tvshow')

    const combinedResult = Result.combine([mediaNameOrError, fileNameOrError, fileExtensionOrError])

    if (combinedResult.isFailure) {
      throw new BaseError(combinedResult.error.message)
    }

    const id: DomainID = DomainID.create(SubMediaData.id)
    const fileName: FileNameValueObject = fileNameOrError.result
    const mediaName: TitleValueObject = mediaNameOrError.result
    const filePath: FilePathValueObject = filePathOrError.result
    const fileExtension: FileExtensionValueObject = fileExtensionOrError.result
    const mediaType: MediaTypeValueObject = mediaTypeOrError.result
    // TO-DO: add these properties/value objects
    // type - done
    // height - done
    // width - done
    // duration - done
    // ratio

    // TO-DO: transform this entity in TVShowMedia
    // and after also add MovieMedia

    return Result.ok(new TVShowMedia({ id, fileName, filePath, mediaName, fileExtension, mediaType }))
  }

  get DTO(): ITVShowMediaDTO {
    return {
      id: this.id.value,
      fileName: this.props.fileName.value,
      mediaName: this.props.mediaName.value,
      fileExtension: this.props.fileExtension.value,
      filePath: this.props.filePath.value,
      mediaType: this.props.mediaType.value,
    }
  }
}
