import { Either, left, right } from "#ddd/either"
import { BaseError } from "#ddd/primitives/base-error"
import { TitleValueObject } from "#modules/MediaCatalog/domain/value-objects/title"
import { FileNameValueObject } from "#modules/MediaCatalog/domain/value-objects/fileName"
import { ISubMediaDTO } from "./interfaces"
import { Result } from "#ddd/result"

export class SubMedia {
	public readonly fileName: FileNameValueObject
	public readonly filePath: string
	public readonly mediaName: TitleValueObject
	public readonly fileFormat: string

	private constructor(
    fileName: FileNameValueObject,
    filePath: string,
    mediaName: TitleValueObject,
    fileFormat: string
  ) {
    this.fileName = fileName
    this.filePath = filePath
    this.mediaName = mediaName
    this.fileFormat = fileFormat
    Object.freeze(this)
  }

	static create(SubMediaData: ISubMediaDTO): Result<SubMedia> {
    const mediaNameOrError = TitleValueObject.create(SubMediaData.mediaName)
    const fileNameOrError = FileNameValueObject.create(SubMediaData.fileName)

    const combinedResult = Result.combine([
      mediaNameOrError,
      fileNameOrError
    ])
    if (combinedResult.isFailure){
      throw new BaseError('combinedResult error test')
    }

    const fileName: FileNameValueObject = fileNameOrError.result
    const mediaName: TitleValueObject = mediaNameOrError.result
    const filePath: string = SubMediaData.filePath
    const fileFormat: string = SubMediaData.fileFormat

    return Result.ok(new SubMedia(fileName, filePath, mediaName, fileFormat))
  }

  get DTO(): ISubMediaDTO {
    return {
      fileName: this.fileName.value,
      mediaName: this.mediaName.value,
      filePath: this.filePath,
      fileFormat: this.fileFormat
    }
  } 
}