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

const getCoinInfo = async (coinId: string) => {
	try {
		const response: any = await axios.get(`https://pro-api.coingecko.com/api/v3/coins/${coinId}`, {
			headers: {
				'accept': "application/json",
				'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
			}
		});

		const website = response.data.links.homepage?.[0] || '';
		const twitter = response.data.links.twitter_screen_name || '';
		const telegram = response.data.links.telegram_channel_identifier || '';
		const marketCap = response.data.market_data.market_cap.usd;
		const price = response.data.market_data.current_price.usd;
		const ath = response.data.market_data.ath.usd;
		const percent = (ath - price) / ath * 100;
		return { percent, marketCap, website, twitter, telegram };
	} catch (error) {
		console.log("Get coin info error: ", error);
	}
	return { percent: 0, marketCap: 0, website: '', twitter: '', telegram: '' };
}

const analyzeSignature = async (transactionSignature: any) => {
	let exsit_signature = await getTransactionBySignature(transactionSignature);
	if (exsit_signature) return;

	const _tx =  stored_transactions.find(tx => tx.signature === transactionSignature)
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
		athPercent: 0,
		marketCap: 0,
		twitter: '',
		telegram: '',
		website: '',
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

	_token.coinGeckoId = await getCoinId(new PublicKey(_token.address));
	let coin_info: any;
	if (_token.coinGeckoId != '') {
		coin_info = await getCoinInfo(_token.coinGeckoId);
		_token.athPercent = coin_info?.percent || 0;
		_token.marketCap = coin_info?.marketCap || 0;
		_token.twitter = coin_info?.twitter || "";
		_token.telegram = coin_info?.telegram || "";
		_token.website = coin_info?.website || "";
	}

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

	if (index === 20) {
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