// type Either<A, E> = Left<A> | Right<E>

type Either<T, U> = Left<T> | Right<U>;

// interface Right<A> {
//   _tag: "right";
//   value: A;
// }

// interface Left<E> {
//   _tag: "Left";
//   value: E;
// }

class Left<T> {
  readonly error: T;
  readonly tag: "left";

  private constructor(error: T) {
    this.error = error;
  }

  isLeft(): this is Left<T> {
    return true;
  }

  isRight(): this is Right<never> {
    return false;
  }

  static create<U>(error: U): Left<U> {
    return new Left(error);
  }
}

class Right<U> {
  readonly result: U;
  readonly tag: "right";

  private constructor(value: U) {
    this.result = value;
  }

  isLeft(): this is Left<never> {
    return false;
  }

  isRight(): this is Right<U> {
    return true;
  }

  static create<U>(value: U): Right<U> {
    return new Right(value);
  }
}

const left = <T>(l: T): Left<T> => Left.create(l)

const right = <U>(r: U): Right<U> => Right.create(r)

export {
  Either,
  left,
  right
}