import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const connection: Connection = new Connection('https://proportionate-distinguished-bush.solana-mainnet.quiknode.pro/23d40a5fef0e147c06129a62e0cc0b975f38fd42', 'confirmed');
// const connection: Connection = new Connection('https://mainnet.helius-rpc.com/?api-key=67cdd4a6-271e-4635-b0d3-6d007ef93fa8', 'confirmed');

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

export const validateEmail = (email: string) =>email.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)!==null;


export const getUserSolBalance = async (address: string) => {
	try {
		const publicKey = new PublicKey(address);
		const balance = await connection.getBalance(publicKey);
		return balance / LAMPORTS_PER_SOL;
	} catch (error) {
		console.log("Getting user's sol balance: ", error);
	}
	return 0;
}