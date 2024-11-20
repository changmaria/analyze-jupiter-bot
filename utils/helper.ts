export const isNumber = (str: any) => !isNaN(str);
export const currentTime = () => Math.round(new Date().getTime() / 1e3);