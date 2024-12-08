enum BotStatus {
	InputWinRate = "Inputing Win Rate",
	InputMinVolume = "Inputing Min Volume",
	InputMinSolBalance = "Inputing Min Sol Balance",
	InputEmail = "Inputing Email",
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