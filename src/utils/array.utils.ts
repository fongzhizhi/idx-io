/** 遍历数组 */
export function iterateArr<V>(arr: V[] | undefined, cb: (value: V, index: number, baseArr: V[]) => boolean | void): boolean {
	if (!arr) {
		return false;
	}
	return arr.some(cb);
}
