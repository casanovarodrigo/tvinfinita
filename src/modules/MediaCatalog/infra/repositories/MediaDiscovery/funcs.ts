import * as fs from 'fs'

/**
 *
 * @param {String} filepath
 * @returns {Promise} returns a promise
 * @resolves {Boolean} resolves true if file exists, false if doesn't
 */
export const existsAsync = (filepath) => {
  return new Promise((resolve, reject) => {
    fs.access(filepath, fs.constants.F_OK, (error) => {
      // console.log('existsAsync Error', error, !error)
      resolve(!error)
    })
  })
}

/**
 * Filter and return only non repeating items
 * @param {Array} arr array list
 * @returns {Array} with unique items
 */
export const uniqueInArray = (arr) => {
  return arr.filter((v, i, a) => a.indexOf(v) === i)
}

export const uniqueInArrayOfObjects = (arr, propertyName) => {
  return arr.filter((v, i, a) => a.findIndex((t) => t[propertyName] === v[propertyName]) === i)
}
