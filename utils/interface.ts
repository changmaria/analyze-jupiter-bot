export enum BotStatus {
	InputWinRate = "Inputing Win Rate",
	InputMinVolume = "Inputing Min Volume",
	// InputATHPercent = "Inputing ATH Percent",
	UsualMode = "Normal Mode"
}

export interface AnalyzedTransaction {
	mode: string;
	trader: string;
	tokenAmount: string;
	solAmount: string;
	tokenAddress: string;
	tokenCoinGeckoId: string;
	win: number;
	athPercent: number;
	marketCap: number;
	socials: {
		twitter: string;
		telegram: string;
		website: string;
	}
	signature: string;
}

export interface BotClient {
	name: string;
	winRate: number;
	minVolume: number;
	// athPercent: number;
	status: BotStatus;
	isPaused: boolean;
	chatId: number;
	subscriptionCreatedAt: number;
	subscriptionExpiresIn: number;
	accessToken: string;
}

export interface Trader {
	address: string;
	totalVolume: number;
	totalTransaction: number;
	winTransaction: number;
}

export interface SwapInstruction {
	amount: string;
	authority: string;
	destination: string;
	source: string;
}

export interface TransactionDataType {
	isBuy: boolean;
	trader: string;
	solAmount: number;
	tokenAmount: number;
	tokenAddress: string;
	win: boolean;
	signature: string;
}

export interface TokenDataType {
	address: string;
	coinGeckoId: string;
	name: string;
	symbol: string;
	watchlistUsers: number;
	price: number;
	ath: number;
	athPercent: number;
	volume: number;
	lp: number;
	price1HPercent: number;
	marketCap: number;
	twitter: string;
	telegram: string;
	website: string;
}

export interface RequestTraderDataType {
	_id: string;
	totalTransaction: number;
	totalVolume: number;
	winTransaction: number;
	winRate: number;
	latestToken: TokenDataType|null;
}