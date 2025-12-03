import { BaseError } from '#ddd/primitives/base-error'
import { TitleValueObject } from '#mediaCatalog/domain/value-objects/title'
import { FileNameValueObject } from '#mediaCatalog/domain/value-objects/fileName'
import { FileExtensionValueObject } from '#mediaCatalog/domain/value-objects/fileExtension'
import { IDirectorDTO } from './interfaces'
import { Result } from '#ddd/result'
import { Entity } from '#ddd/primitives/entity'
import { DomainEntity } from '#ddd/primitives/domain-entity'
import { DomainID } from '#ddd/primitives/domain-id'
import { FilePathValueObject } from '#mediaCatalog/domain/value-objects/filePath'
import { MediaTypeValueObject } from '#mediaCatalog/domain/value-objects/mediaType'

interface IDirector extends DomainEntity {
  fileName: FileNameValueObject
  filePath: FilePathValueObject
  mediaName: TitleValueObject
  fileExtension: FileExtensionValueObject
  mediaType: MediaTypeValueObject
}

export class Director extends Entity<IDirector> {
  private constructor(props: IDirector) {
    super(props)
    // Object.freeze(this)
  }

  static create(SubMediaData: IDirectorDTO): Result<Director> {
    const mediaNameOrError = TitleValueObject.create(SubMediaData.mediaName)
    const fileNameOrError = FileNameValueObject.create(SubMediaData.fileName)
    const fileExtensionOrError = FileNameValueObject.create(SubMediaData.fileExtension)
    const filePathOrError = FilePathValueObject.create(SubMediaData.filePath)
    const mediaTypeOrError = FileNameValueObject.create(SubMediaData.mediaType || 'tvshow')

    const combinedResult = Result.combine([mediaNameOrError, fileNameOrError, fileExtensionOrError])

    if (combinedResult.isFailure) {
      throw new BaseError(combinedResult.error.message)
    }

    // TODO: Director class is temporary and will be refactored soon
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const id = DomainID.create(SubMediaData.id)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileName = fileNameOrError.result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mediaName = mediaNameOrError.result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filePath = filePathOrError.result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileExtension = fileExtensionOrError.result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mediaType = mediaTypeOrError.result
    // TO-DO: add these properties/value objects
    // type - done
    // height - done
    // width - done
    // duration - done
    // ratio

    // TO-DO: transform this entity in TVShowMedia
    // and after also add MovieMedia

    return Result.ok(
      new Director({
        id: DomainID.create(SubMediaData.id),
        fileName: fileNameOrError.result,
        filePath: filePathOrError.result,
        mediaName: mediaNameOrError.result as MediaTypeValueObject,
        fileExtension: fileExtensionOrError.result,
        mediaType: mediaTypeOrError.result,
      })
    )
  }

  get DTO(): IDirectorDTO {
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
