export enum BotStatus {
	InputWinRate = "Inputing Win Rate",
	InputMinVolume = "Inputing Min Volume",
	InputMinSolBalance = "Inputing Min Sol Balance",
	// InputATHPercent = "Inputing ATH Percent",
	InputEmail = "Inputing Email",
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
	chatId: number;
	winRate: number;
	minVolume: number;
	minSolBalance: number;
	// athPercent: number;
	status: BotStatus;
	isPaused: boolean;
	// chatId: number;
	email: string;
	subscriptionCreatedAt: number;
	subscriptionExpiresIn: number;
	// accessToken: string;
	membershipId: string;
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
	poolAddress: string;
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
	solBalance: number;
	latestToken: TokenDataType|null;
}