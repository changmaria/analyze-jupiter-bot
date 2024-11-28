import { MongoClient } from "mongodb"
import { BotClient, BotStatus, RequestTraderDataType } from "./interface";
import { SchemaBotClient, SchemaToken, SchemaTransaction } from "./schema";

const MONGODB_URI = "mongodb://0.0.0.0:27017";
const MONGODB_DATABASE = "solana-jupiter-sword"
export const defaultWinRate: number = 40;
export const defaultMinVolume: number = 1000;
export const defaultATHPercent: number = 80;

const client = new MongoClient(MONGODB_URI);
const db = client.db(MONGODB_DATABASE);

const DTransactions = db.collection<SchemaTransaction>('transactions');
const DTokens = db.collection<SchemaToken>('tokens');
const DClients = db.collection<SchemaBotClient>('bot-clients');

export const open = async () => {
	try {
		await client.connect()
		console.log("Successfully established a MongoDB connection.")
		await DTransactions.createIndex({ trader: 1, tokenAddress: 1, isBuy: 1, }, { unique: false, name: 'transaction_trader' });
		await DTransactions.createIndex({ signature: 1 }, { unique: true, name: 'transaction_signature' });

		await DTokens.createIndex({ address: 1 }, { unique: true, name: 'token_address' });
		await DTokens.createIndex({ athPercent: 1 }, { unique: false, name: 'token_ath_percent' });

		await DClients.createIndex({ name: 1 }, { unique: true, name: 'tg_username' });
		await DClients.createIndex({ subscription_code: 1 }, { unique: false, name: 'subscription_code' });
	} catch (error) {
		console.log("MongoDB connection failure: ", error)
		process.exit()
	}
}

export const close = async () => {
	try {
		await client.close()
	} catch (error) {
		process.exit()
	}
}

export const getClientData = async (tgUserName: string) => {
	try {
		const r = await DClients.findOne({ name: tgUserName });
		if (!!r?._id) {
			return r;
		}
	} catch (error) {
		console.log("Get client data error: ", error);
	}
	return {
		name: '',
		winRate: 0,
		minVolume: 0,
		athPercent: 0,
		lastedTokensCount: 0,
		status: BotStatus.UsualMode,
		isPaused: false,
		chatId: 0,
		subscription_created_at: 0,
		subscription_expires_in: 0,
		subscription_code: ''
	};
}

export const getClients = async () => {
	try {
		const r = await DClients.find({ isPaused: false, status: BotStatus.UsualMode }).toArray();
		return r;
	} catch (error) {
		console.log("Get clients error: ", error);
	}
	return [];
}

export const addClient = async (tgUserName: string, chatId: number) => {
	try {
		const client = await DClients.findOne({ name: tgUserName });
		if (!!client?._id) {
			return false;
		}

		const r = await DClients.insertOne({
			name: tgUserName,
			winRate: defaultWinRate,
			minVolume: defaultMinVolume,
			athPercent: defaultATHPercent,
			status: BotStatus.UsualMode,
			isPaused: false,
			chatId,
			subscription_created_at: 0,
			subscription_expires_in: 0,
			subscription_code: ''
		});

		if (!!r.insertedId) return true;
	} catch (error) {
		console.log("Add client data error: ", error);
	}
	return false;
}

export const updateClientData = async (_data: BotClient) => {
	try {
		const client = await DClients.findOne({ name: _data.name });
		if (!client?._id) return false;

		await DClients.updateOne(
			{ name: _data.name },
			{
				$set: {
					winRate: _data.winRate,
					minVolume: _data.minVolume,
					athPercent: _data.athPercent,
					isPaused: _data.isPaused,
					status: _data.status,
					subscription_created_at: _data.subscription_created_at,
					subscription_expires_in: _data.subscription_expires_in
				},
				$setOnInsert: {
					name: _data.name,
					chatId: _data.chatId
				}
			},
			{
				upsert: true
			}
		);

		return true;
	} catch (error) {
		console.log("Update client data error: ", error);
	}
	return false;
}

export const getExsitSubscriptionCode = async (code: string) => {
	try {
		const r = await DClients.findOne({ subscription_code: code });
		if (!!r?._id) return true;
	} catch (error) {
		console.log("Get exsit subscription code error: ", error);
	}
	return false;
}

export const insertTransactions = async (txs: SchemaTransaction[]) => {
	try {
		if (!txs.length) return;
		const r = await DTransactions.insertMany(txs);

		if (r.insertedCount === txs.length) return true;
	} catch (error) {
		console.log("Update client data error: ", error);
	}
	return false;
}

export const getLastedBuyTransaction = async (trader: string, tokenAddress: string) => {
	let solAmount = 0, tokenAmount = 0
	try {
		const r = await DTransactions.find({ trader, tokenAddress, isBuy: true }).sort({ created: -1 }).skip(0).limit(1).toArray();
		if (r.length === 1) {
			solAmount = r[0].solAmount;
			tokenAmount = r[0].tokenAmount;
		}
	} catch (error) {
		console.log("Update client data error: ", error);
	}
	return {
		solAmount,
		tokenAmount
	};
}

export const getTransactionBySignature = async (signature: string) => {
	try {
		const r = await DTransactions.findOne({ signature });
		if (!!r?._id) return true;
	} catch (error) {
		console.log("Update client data error: ", error);
	}
	return false;
}

export const updateToken = async (token: SchemaToken) => {
	try {
		if (!token.address) return;

		await DTokens.updateOne(
			{
				address: token.address
			},
			{
				$set: {
					watchlistUsers: token.watchlistUsers,
					price: token.price,
					ath: token.ath,
					athPercent: token.athPercent,
					volume: token.volume,
					lp: token.lp,
					price1HPercent: token.price1HPercent,
					marketCap: token.marketCap,
					twitter: token.twitter,
					telegram: token.telegram,
					website: token.website,
				},
				$setOnInsert: {
					name: token.name,
					symbol: token.symbol,
					coinGeckoId: token.coinGeckoId,
				},
			},
			{
				upsert: true
			}
		)

		return true;
	} catch (error) {
		console.log("Update token error: ", error);
	}
	return false;
}

export const getTokensByATHPercent = async (athPercent: number, page: number, countPerPage: number) => {
	try {
		const r = await DTokens.find({ athPercent: { $gte: athPercent } }).sort({ athPercent: -1 }).skip((page - 1) * countPerPage).limit(countPerPage).toArray();
		return !!r?.length ? r : [];
	} catch (error) {
		console.log("Get tokens by ATH percent error: ", error);
	}
	return [];
}

export const getTokensCountByATHPercent = async (athPercent: number) => {
	try {
		const count = await DTokens.count({ athPercent: { $gte: athPercent } });
		return count;
	} catch (error) {
		console.log("Get tokens by ATH percent error: ", error);
	}
	return 0;
}

export const getTradersByWinRate = async (winRate: number, minVolume: number, page: number, countPerPage: number) => {
	try {
		const r = await DTransactions.aggregate([
			{
				$group: {
					_id: "$trader",
					totalTransaction: {
						$sum: 1
					},
					totalVolume: {
						$sum: {
							$cond: { if: { $eq: ["$isBuy", true] }, then: "$solAmount", else: 0 }
						}
					},
					winTransaction: {
						$sum: {
							$cond: { if: { $eq: ["$win", true] }, then: 1, else: 0 }
						}
					}
				}
			},
			{
				$project: {
					totalTransaction: 1,
					totalVolume: 1,
					winTransaction: 1,
					winRate: {
						$cond: {
							if: { $ne: ['$totalTransaction', 0] },
							then: { $divide: ['$winTransaction', '$totalTransaction'] },
							else: 0
						}
					}
				}
			},
			{
				$match: {
					$and: [
						{
							winRate: { $gte: winRate }
						},
						{
							totalVolume: { $gte: minVolume }
						}
					]
				}
			},
			{
				$sort: { winRate: -1, totalVolume: -1 }
			},
			{
				$facet: {
					paginatedResults: [{ $skip: (page - 1) * countPerPage }, { $limit: countPerPage }],
					totalCount: [
						{
							$count: 'count'
						}
					]
				}
			}
		]).toArray();

		let traders = [] as RequestTraderDataType[];

		for (let i of r[0]?.paginatedResults) {
			if (!!i?._id) {
				const _latestToken = await DTransactions.find({ trader: i._id, isBuy: true }).sort({ created: -1 }).skip(0).limit(1).toArray();
				const address = _latestToken?.[0]?.tokenAddress || "";

				const _token = await DTokens.findOne({ address });

				traders.push({
					_id: i?._id || "",
					totalTransaction: i?.totalTransaction || 0,
					totalVolume: i?.totalVolume || 0,
					winTransaction: i?.winTransaction || 0,
					winRate: i?.winRate || 0,
					latestToken: _token
				})
			}

		}

		return {
			traders,
			count: r[0]?.totalCount[0]?.count || 0
		};
	} catch (error) {
		console.log("Get traders by win rate error: ", error);
	}
	return {
		traders: [],
		count: 0
	};
}