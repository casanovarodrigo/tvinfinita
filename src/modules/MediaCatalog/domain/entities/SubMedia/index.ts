import { BaseError } from "#ddd/primitives/base-error"
import { TitleValueObject } from "#modules/MediaCatalog/domain/value-objects/title"
import { FileNameValueObject } from "#modules/MediaCatalog/domain/value-objects/fileName"
import { FileExtensionValueObject } from "#modules/MediaCatalog/domain/value-objects/fileExtension"
import { ISubMediaDTO } from "./interfaces"
import { Result } from "#ddd/result"

export class SubMedia {
	public readonly fileName: FileNameValueObject
	public readonly filePath: string
	public readonly mediaName: TitleValueObject
	public readonly fileExtension: FileExtensionValueObject

	private constructor(
    fileName: FileNameValueObject,
    filePath: string,
    mediaName: TitleValueObject,
    fileExtension: FileExtensionValueObject
  ) {
    this.fileName = fileName
    this.filePath = filePath
    this.mediaName = mediaName
    this.fileExtension = fileExtension
    Object.freeze(this)
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

    const fileName: FileNameValueObject = fileNameOrError.result
    const mediaName: TitleValueObject = mediaNameOrError.result
    const filePath: string = SubMediaData.filePath
    const fileExtension: FileExtensionValueObject = fileExtensionOrError.result

    return Result.ok(new SubMedia(fileName, filePath, mediaName, fileExtension))
  }

  get DTO(): ISubMediaDTO {
    return {
      fileName: this.fileName.value,
      mediaName: this.mediaName.value,
      fileExtension: this.fileExtension.value,
      filePath: this.filePath
    }
  } 
}