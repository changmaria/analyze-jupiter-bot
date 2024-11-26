export const isNumber = (str: any) => !isNaN(str);
export const currentTime = () => Math.round(new Date().getTime() / 1e3);

export const formatBigNumber = (value: number): string => {
	let _result = '';
    let _value = Math.abs(value);
	if (_value >= 1e6) {
		_result = `${Math.round(_value / 1e4) / 1e2}M`;
	} else if (_value >= 1e3) {
		_result = `${Math.round(_value / 10) / 1e2}K`;
	} else {
		_result = _value.toString();
	}
	return `${value < 0 ? '-' : ''}${_result}`;
}