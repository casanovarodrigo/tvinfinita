import { TimestampValueObject } from '.'
import { InvalidTimestamp } from '../../errors/timestamp.value-object copy'

describe('TimestampValueObject', () => {
  // it('should return a valid timestamp value object', () => {
  // 	// const timestampOrError = TimestampValueObject.create(4000)
  // 	// const timestampOrError = TimestampValueObject.create(1209600)
  // 	const timestampOrError = TimestampValueObject.create(1204200)
  // 	if (timestampOrError.isSuccess)
  //  		expect(timestampOrError.result.value).toEqual('Bob Esponja')
  // })

  it('should return a valid timestamp value object', () => {
    const timestampOrError = TimestampValueObject.create(1209600)
    if (timestampOrError.isSuccess) expect(timestampOrError.result.value).toEqual('02:00:00:00:00')
  })

  it('should return a valid timestamp value object', () => {
    const timestampOrError = TimestampValueObject.create(4000)
    if (timestampOrError.isSuccess) expect(timestampOrError.result.value).toEqual('01:06:40')
  })

  it('should return a valid timestamp value object', () => {
    const timestampOrError = TimestampValueObject.create(60)
    if (timestampOrError.isSuccess) expect(timestampOrError.result.value).toEqual('00:01:00')
  })

  it('should return a valid timestamp value object', () => {
    const timestampOrError = TimestampValueObject.create(66)
    if (timestampOrError.isSuccess) expect(timestampOrError.result.value).toEqual('00:01:06')
  })

  it('should return an invalid timestamp value object', () => {
    const seconds = -1
    const timestampOrError = TimestampValueObject.create(seconds)
    expect(timestampOrError.error).toBeInstanceOf(InvalidTimestamp)
    expect(timestampOrError.error.message).toEqual(
      `The number ${seconds} must be greater than or equal than 0`
    )
  })
})
