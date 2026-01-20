/** 将任意值转换为布尔值 */
export function toBoolean(value: unknown): boolean {
	return Boolean(value);
}

/** 将任意类型转换为字符串 */
export function toString(obj: unknown, defaultStr = ''): string {
	return isNone(obj) ? defaultStr : String(obj);
}

export function isObject(obj: unknown): boolean {
	return obj ? typeof obj == 'object' : false;
}

/** 是否为空（undefined, null, ''） */
export function isNone(obj: unknown): boolean {
	return Object.is(obj, undefined) || Object.is(obj, null) || Object.is(obj, '');
}

/** 是否为对象自有属性 */
export function hasOwnProperty(obj: any, key: PropertyKey): boolean {
	return obj ? Object.hasOwnProperty.call(obj, key) : false;
}

/** 遍历对象 */
export function iterateObject<V>(obj: Record<string, V> | undefined, cb: (value: V, ket: string, obj: Record<string, V>) => boolean | void): boolean {
	if (!obj) {
		return false;
	}
	for (const key in obj) {
		const value = obj[key] as V;
		if (cb(value, key, obj)) {
			return true;
		}
	}
	return false;
}

/** 是否为有效bool */
export function isVialidBool(bool:boolean | undefined) {
	return typeof bool == 'boolean';
}