import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidTimestamp } from "../../errors/timestamp.value-object copy"

interface ITimestampValueObject {
  value: string
}

interface TimestampIteration {
  key: string
  text: string
  min: number
  module: number
}

export class TimestampValueObject extends ValueObject<ITimestampValueObject> {
  static minCharCount: number = 3
  static maxCharCount: number = 150

  private constructor(props: ITimestampValueObject) {
    super(props)
  }

  private static validate(secondsPassed: number) {
    const schema = Joi.number()
      .min(0)
      .messages({
        'string.empty': `The string ${secondsPassed} cannot be an empty field`,
        'number.min': `The number ${secondsPassed} must be greater than or equal than 0`
      })
      .label('SecondsPassed')

    return schema.validate(secondsPassed,
      { abortEarly: false })
  }

  public static create(secondsPassed: number, iterations: number = 3): Result<TimestampValueObject> {
    const titleOrError = this.validate(secondsPassed)
    if (titleOrError.error){
      return Result.fail(new InvalidTimestamp(titleOrError.error.message))
    }

    const iteration: TimestampIteration[] = [{
      key: 's',
      text: 'seconds',
      min: 0,
      module: 60
    },
    {
      key: 'm',
      text: 'minutes',
      min: 60,
      module: 60
    },
    {
      key: 'h',
      text: 'hours',
      min: 3600,
      module: 24
    },
    {
      key: 'd',
      text: 'days',
      min: 86400,
      module: 7
    },
    {
      key: 'w',
      text: 'weeks',
      min: 604800,
      module: 4
    }]

    let stamp: string = ''
    const minIterations = iterations
    const currIndex: number = iteration.filter((item: TimestampIteration, index: number) => {
      const currIteration = item
      const nextIteration = iteration[index+1] || null
      let boolRes: boolean = false
      if (
          secondsPassed >= currIteration.min
          && nextIteration
          && secondsPassed < nextIteration.min
      ){
        boolRes = true
      } else if (secondsPassed >= currIteration.min){
        boolRes = true
      }
      return boolRes
    }).length


    const iterationsToUse: number = currIndex >= 0? Math.max(currIndex, minIterations) : minIterations
    for (let index = 0; index < iterationsToUse; index++) {
      let numberToUse: number | string
      if (iteration[index].min === 0 && secondsPassed){
        numberToUse = secondsPassed % iteration[index].module
      } else if ((secondsPassed / iteration[index].min) > 0){
        numberToUse = Math.floor(secondsPassed / iteration[index].min) % iteration[index].module
      }

      numberToUse = numberToUse.toString().padStart(2, '0')
      stamp = index === 0? `${numberToUse}` : `${numberToUse}:${stamp}`
    }

    return Result.ok(new TimestampValueObject({value: stamp}))
  }
}