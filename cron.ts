import { getAccount } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { SwapInstruction, TokenDataType, TransactionDataType } from "./utils/interface";
import { SchemaTransaction } from './utils/schema';
import { getLastedBuyTransaction, getTransactionBySignature, insertTransactions, updateToken, open } from "./utils/mongodb";
import { currentTime } from "./utils/helper";

const axios = require('axios');
require('dotenv').config();

const connection: Connection = new Connection('https://proportionate-distinguished-bush.solana-mainnet.quiknode.pro/23d40a5fef0e147c06129a62e0cc0b975f38fd42');
const jupiterSwapProgram = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
const solTokenAddress = new PublicKey('So11111111111111111111111111111111111111112');
const signatures: any[] = [];
let stored_transactions: SchemaTransaction[] = [];
let index = 0;
let flag = 0;

connection.onLogs(jupiterSwapProgram, async (logs: any, ctx: any) => {
	if (logs.err == null) {
		signatures.push(logs.signature);
		if (flag == 0) {
			flag = 1;
			while (1) {
				try {
					await analyzeSignature(signatures[0]);
				} catch (err) {
					console.log("Jupiter on logs error: ", err);
				}
				signatures.shift();
			}
		}
	}
})

const getCoinId = async (tokenAddress: PublicKey): Promise<string> => {
	try {
		let response: any;
		response = await axios.get(`https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/${tokenAddress.toBase58()}/info`, {
			headers: {
				'accept': "application/json",
				'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
			}
		});

		if (response.data.data.attributes.coingecko_coin_id == null) return '';
		const coinId: string = response.data.data.attributes.coingecko_coin_id;
		return coinId;
	} catch (error) {
		console.log("Get coin id error: ", error);
	}
	return "";
}

const getCoinInfo = async (coinId: string, address: string) => {
	try {
		const res_1: any = await axios.get(`https://pro-api.coingecko.com/api/v3/coins/${coinId}`, {
			headers: {
				'accept': "application/json",
				'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
			}
		});

		const res_2: any = await axios.get(`https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/${address}`, {
			headers: {
				'accept': "application/json",
				'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
			}
		});

		let lp = 0;

		if (!!res_2.data.data.relationships.top_pools.data?.[0]?.id) {
			const _id: string = res_2.data.data.relationships.top_pools.data?.[0]?.id || "";
			if (_id.startsWith('solana_')) {
				const res_3: any = await axios.get(`https://pro-api.coingecko.com/api/v3/onchain/networks/solana/pools/${_id.replace('solana_', '')}`, {
					headers: {
						'accept': "application/json",
						'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
					}
				});
				if (!res_3.data?.data?.id) return;
				const _d = res_3.data.data.attributes;
				if (!!Number(_d.market_cap_usd) && !!Number(_d.fdv_usd)) {
					lp = (Number(_d.reserve_in_usd) / Number(_d.market_cap_usd)) * Number(_d.fdv_usd);
				} else {
					lp = Number(_d.reserve_in_usd);
				}
			}
		}

		const price = res_1.data.market_data.current_price.usd;
		const ath = res_1.data.market_data.ath.usd;
		const name = res_1.data.name;
		const symbol = res_1.data.symbol;
		const watchlistUsers = res_1.data.watchlist_portfolio_users;
		const website = res_1.data.links.homepage?.[0] || '';
		const twitter = res_1.data.links.twitter_screen_name || '';
		const telegram = res_1.data.links.telegram_channel_identifier || '';
		const marketCap = res_1.data.market_data.market_cap.usd;
		const volume = res_1.data.market_data.total_volume.usd;
		const price1HPercent = res_1.data.market_data.price_change_percentage_1h_in_currency.usd * 100;
		const athPercent = (ath - price) / ath * 100;
		return { name, symbol, watchlistUsers, price, ath, athPercent, marketCap, volume, lp, price1HPercent, website, twitter, telegram };
	} catch (error) {
		console.log("Get coin info error: ", error);
	}
	return { percent: 0, marketCap: 0, website: '', twitter: '', telegram: '' };
}

const analyzeSignature = async (transactionSignature: any) => {
	let exsit_signature = await getTransactionBySignature(transactionSignature);
	if (exsit_signature) return;

	const _tx = stored_transactions.find(tx => tx.signature === transactionSignature)
	if (!!_tx?.signature) return;

	const data: any = await connection.getParsedTransaction(transactionSignature, {
		maxSupportedTransactionVersion: 0
	});
	if (data == null) return;

	const transferInstructions = [];
	for (let i = 0; i < data.meta.innerInstructions.length; i++) {
		for (let j = 0; j < data.meta.innerInstructions[i].instructions.length; j++) {
			const temp = data.meta.innerInstructions[i].instructions[j].parsed;
			if (temp == undefined) continue;
			if (temp.type == "transfer" && data.meta.innerInstructions[i].instructions[j].program == 'spl-token') transferInstructions.push(temp.info);
		}
	}

	if (transferInstructions.length == 2) {
		console.log("accept signatures ===>", transactionSignature);
		await analyzeSwapInstructions(transferInstructions, transactionSignature);
	}
}

const analyzeSwapInstructions = async (instructions: SwapInstruction[], transactionSignature: any): Promise<any> => {
	let _transaction: TransactionDataType = {
		isBuy: false,
		trader: '',
		solAmount: 0,
		tokenAmount: 0,
		tokenAddress: '',
		win: false,
		signature: ''
	}

	let _token: TokenDataType = {
		address: '',
		coinGeckoId: '',
		name: '',
		symbol: '',
		watchlistUsers: 0,
		price: 0,
		ath: 0,
		athPercent: 0,
		marketCap: 0,
		volume: 0,
		lp: 0,
		price1HPercent: 0,
		website: '',
		twitter: '',
		telegram: ''
	}

	const sendDestinationPubkey = new PublicKey(instructions[0].destination);
	const receiveDestinationPubkey = new PublicKey(instructions[1].destination);
	let sendTokenData;
	let receiveTokenData;

	try {
		sendTokenData = await getAccount(connection, sendDestinationPubkey);
	} catch (err) {
		sendTokenData = await getAccount(connection, new PublicKey(instructions[0].source));
	}

	try {
		receiveTokenData = await getAccount(connection, receiveDestinationPubkey);
	} catch (err) {
		receiveTokenData = await getAccount(connection, new PublicKey(instructions[1].source));
	}

	_transaction.trader = instructions[0].authority;

	if (sendTokenData.mint.toBase58() == solTokenAddress.toBase58()) {
		_transaction.isBuy = true;
		_transaction.solAmount = parseFloat(instructions[0].amount);
		_transaction.tokenAmount = parseFloat(instructions[1].amount);
		_token.address = receiveTokenData.mint.toBase58();
		_transaction.tokenAddress = receiveTokenData.mint.toBase58();
	} else if (receiveTokenData.mint.toBase58() == solTokenAddress.toBase58()) {
		_transaction.isBuy = false;
		_transaction.solAmount = parseFloat(instructions[1].amount);
		_transaction.tokenAmount = parseFloat(instructions[0].amount);
		_transaction.tokenAddress = sendTokenData.mint.toBase58();
		_token.address = sendTokenData.mint.toBase58();
	} else {
		return;
	}

	if (_token.address.slice(-4) !== 'pump') return;

	_token.coinGeckoId = await getCoinId(new PublicKey(_token.address));

	if (!_token.coinGeckoId) return;

	let coin_info: any;
	coin_info = await getCoinInfo(_token.coinGeckoId, _token.address);
	_token.name = coin_info?.name || "";
	_token.symbol = coin_info?.symbol || "";
	_token.watchlistUsers = Number(coin_info?.watchlistUsers) || 0;
	_token.price = Number(coin_info?.price) || 0;
	_token.ath = Number(coin_info?.ath) || 0;
	_token.athPercent = Number(coin_info?.athPercent) || 0;
	_token.marketCap = Number(coin_info?.marketCap) || 0;
	_token.volume = Number(coin_info?.volume) || 0;
	_token.lp = Number(coin_info?.lp) || 0;
	_token.price1HPercent = Number(coin_info?.price1HPercent) || 0;
	_token.website = coin_info?.website || "";
	_token.twitter = coin_info?.twitter || "";
	_token.telegram = coin_info?.telegram || "";

	if (!_transaction.isBuy) {
		const { solAmount, tokenAmount } = await getLastedBuyTransaction(_transaction.trader, _transaction.tokenAddress);
		if (!!solAmount && !!tokenAmount) {
			const predictSolAmount = solAmount * _transaction.tokenAmount / tokenAmount;
			if (_transaction.solAmount > predictSolAmount) {
				_transaction.win = true;
			}
		}
	}
	_transaction.signature = transactionSignature;
	stored_transactions.push({ ..._transaction, created: currentTime() });
	index++;

	if (index === 200) {
		await insertTransactions(stored_transactions);
		index = 0;
		stored_transactions = [];
	}

	if (!!_token.coinGeckoId) await updateToken(_token);
}

open().then(async () => {
	try {

	} catch (error) {
		console.log("Mongodb open is failed error: ", error);
		process.exit(1)
	}
})