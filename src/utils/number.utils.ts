/** 是否为有效数字 */
export function isNumeric(number: string | number | undefined) {
    return number !== undefined && isValidNumber(parseFloat(number.toString()))
}

/** 是否为有效数字 */
export function isValidNumber(value: number | undefined) {
    return typeof value == 'number' && !Number.isNaN(value) && isFinite(value);
}