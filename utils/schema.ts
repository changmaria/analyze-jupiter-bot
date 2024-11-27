enum BotStatus {
	InputWinRate = "Inputing Win Rate",
	InputMinVolume = "Inputing Min Volume",
	InputMinWalletSize = "Inputing Min Wallet Size",
	InputATHPercent = "Inputing ATH Percent",
	UsualMode = "Normal Mode"
}

export interface SchemaTransaction {
	isBuy: boolean;
	trader: string;
	solAmount: number;
	tokenAmount: number;
	tokenAddress: string;
	win: boolean;
	signature: string;
	created: number;
}

export interface SchemaToken {
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

export interface SchemaBotClient {
	name: string;
	winRate: number;
	minVolume: number;
	minWalletSize: number;
	athPercent: number;
	status: BotStatus;
	isPaused: boolean;
	chatId: number;
	subscription_created_at: number;
	subscription_expires_in: number;
	subscription_code: string;
}