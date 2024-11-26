enum BotStatus {
	InputWinRate = "Inputing Win Rate",
	InputMinVolume = "Inputing Min Volume",
	InputATHPercent = "Inputing ATH Percent",
	InputTokensCount = "Inputing Latest Tokens Display Count",
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
	athPercent: number;
	marketCap: number;
	twitter: string;
	telegram: string;
	website: string;
}

export interface SchemaBotClient {
	name: string;
	winRate: number;
	minVolume: number;
	athPercent: number;
	lastedTokensCount: number;
	status: BotStatus;
	isPaused: boolean;
	chatId: number;
	subscription_created_at: number;
	subscription_expires_in: number;
	subscription_code: string;
}