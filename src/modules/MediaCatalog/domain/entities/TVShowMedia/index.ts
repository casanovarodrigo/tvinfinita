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
import { MediaDurationValueObject } from '#mediaCatalog/domain/value-objects/mediaDuration'
import { MediaHeightValueObject } from '#mediaCatalog/domain/value-objects/mediaHeight'
import { MediaWidthValueObject } from '#mediaCatalog/domain/value-objects/mediaWidth'

interface ITVShowMedia extends DomainEntity {
  fileName: FileNameValueObject
  filePath: FilePathValueObject
  folderName: FileNameValueObject
  title: TitleValueObject
  fileExtension: FileExtensionValueObject
  duration: MediaDurationValueObject
  width: MediaDurationValueObject
  height: MediaDurationValueObject
  ratio: string
}

export class TVShowMedia extends Entity<ITVShowMedia> {
  private constructor(props: ITVShowMedia) {
    super(props)
    // Object.freeze(this)
  }

  static create(SubMediaData: ITVShowMediaDTO): Result<TVShowMedia> {
    const titleOrError = TitleValueObject.create(SubMediaData.title)
    const fileNameOrError = FileNameValueObject.create(SubMediaData.fileName)
    const fileExtensionOrError = FileNameValueObject.create(SubMediaData.fileExt)
    const filePathOrError = FilePathValueObject.create(SubMediaData.filePath)
    const durationOrError = MediaDurationValueObject.create(SubMediaData.duration)
    const folderNameOrError = FileNameValueObject.create(SubMediaData.folderName)
    const widthOrError = MediaWidthValueObject.create(SubMediaData.width)
    const heightOrError = MediaHeightValueObject.create(SubMediaData.height)

    const combinedResult = Result.combine([titleOrError, fileNameOrError, fileExtensionOrError])

    if (combinedResult.isFailure) {
      throw new BaseError(combinedResult.error.message)
    }

    return Result.ok(
      new TVShowMedia({
        id: DomainID.create(SubMediaData.id),
        fileName: fileNameOrError.result,
        filePath: filePathOrError.result,
        title: titleOrError.result,
        fileExtension: fileExtensionOrError.result,
        duration: durationOrError.result,
        folderName: folderNameOrError.result,
        width: widthOrError.result,
        height: heightOrError.result,
        ratio: SubMediaData.ratio,
      })
    )
  }

  get DTO(): ITVShowMediaDTO {
    return {
      id: this.id.value,
      fileName: this.props.fileName.value,
      title: this.props.title.value,
      filePath: this.props.filePath.value,
      folderName: this.props.folderName.value,
      fileExt: this.props.fileExtension.value,
      width: this.props.width.value,
      height: this.props.height.value,
      ratio: this.props.ratio,
      duration: this.props.duration.value,
    }
  }
}
