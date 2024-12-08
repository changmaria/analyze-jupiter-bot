import { MongoClient } from "mongodb"
import { BotClient, BotStatus, RequestTraderDataType } from "./interface";
import { SchemaBotClient, SchemaToken, SchemaTransaction } from "./schema";
import { currentTime, getUserSolBalance } from "./helper";
import { checkMembershipWithEmail, getActiveMembershipIds } from "./subscription";

const MONGODB_URI = "mongodb://0.0.0.0:27017";
const MONGODB_DATABASE = "solana-jupiter-sword"
export const defaultWinRate: number = 40;
export const defaultMinVolume: number = 1000;
export const defaultMinSolBalance: number = 1000;
// export const defaultATHPercent: number = 80;
export const SOL_PRICE = 200;

const client = new MongoClient(MONGODB_URI);
const db = client.db(MONGODB_DATABASE);

const DTransactions = db.collection<SchemaTransaction>('transactions');
const DTokens = db.collection<SchemaToken>('tokens');
const DClients = db.collection<SchemaBotClient>('bot-clients');

export const open = async () => {
	try {
		await client.connect()
		console.log("Successfully established a MongoDB connection.");

		await DTransactions.createIndex({ trader: 1, tokenAddress: 1, isBuy: 1, }, { unique: false, name: 'transaction_trader' });
		await DTransactions.createIndex({ signature: 1 }, { unique: true, name: 'transaction_signature' });

		await DTokens.createIndex({ address: 1 }, { unique: true, name: 'token_address' });
		// await DTokens.createIndex({ athPercent: 1 }, { unique: false, name: 'token_ath_percent' });

		await DClients.createIndex({ chatId: 1 }, { unique: true, name: 'tg_chat_id' });
		await DClients.createIndex({ membershipId: 1 }, { unique: false, name: 'membership_id' });

		// await DClients.updateMany({}, {$set: {minSolBalance: 1000}});
		// const r = await DClients.find({}).toArray();
		// console.log("clients============>", r);
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

export const getClientData = async (chatId: number) => {
	try {
		const r = await DClients.findOne({ chatId });
		if (!!r?._id) {
			return r;
		}
	} catch (error) {
		console.log("Get client data error: ", error);
	}
	return {
		chatId: 0,
		winRate: 0,
		minVolume: 0,
		minSolBalance: 0,
		// athPercent: 0,
		lastedTokensCount: 0,
		status: BotStatus.UsualMode,
		isPaused: false,
		// chatId: 0,
		email: '',
		subscriptionCreatedAt: 0,
		subscriptionExpiresIn: 0,
		membershipId: ''
	};
}

export const getClients = async () => {
	try {
		const now = currentTime();
		const r = await DClients.find({ isPaused: false, membershipId: { $ne: "" }, subscriptionExpiresIn: { $gte: now } }).toArray();
		return r;
	} catch (error) {
		console.log("Get clients error: ", error);
	}
	return [];
}

export const updateMembershipsData = async () => {
	try {
		const { success, membership_ids } = await getActiveMembershipIds();

		if (!success || !membership_ids.length) return;

		const r = await DClients.find(
			{
				membershipId: { $nin: membership_ids },
				subscriptionCreatedAt: { $ne: 0 },
				subscriptionExpiresIn: { $ne: 0 },
				email: { $ne: "" }
			}
		).toArray();

		console.log("Delete membership info from these clients =========>", r);

		await DClients.updateMany(
			{
				membershipId: { $nin: membership_ids },
				subscriptionCreatedAt: { $ne: 0 },
				subscriptionExpiresIn: { $ne: 0 },
				email: { $ne: "" }
			},
			{
				$set: {
					membershipId: "",
					subscriptionCreatedAt: 0,
					subscriptionExpiresIn: 0
				}
			}
		);
	} catch (error) {
		console.log("Check membership valid error: ", error);
	}
}

export const addClient = async (chatId: number) => {
	try {
		const client = await DClients.findOne({ chatId });
		if (!!client?.chatId) {
			return null;
		}

		const clientData: BotClient = {
			chatId,
			winRate: defaultWinRate,
			minVolume: defaultMinVolume,
			minSolBalance: defaultMinSolBalance,
			status: BotStatus.UsualMode,
			isPaused: false,
			email: "",
			subscriptionCreatedAt: 0,
			subscriptionExpiresIn: 0,
			membershipId: ""
		}

		await DClients.insertOne(clientData);

		return clientData;
	} catch (error) {
		console.log("Add client data error: ", error);
	}
	return null;
}

export const updateClientData = async (_data: BotClient) => {
	try {
		// const client = await DClients.findOne({ name: _data.name });
		// if (!client?._id) return false;

		await DClients.updateOne(
			{ chatId: _data.chatId },
			{
				$set: {
					winRate: _data.winRate,
					minVolume: _data.minVolume,
					minSolBalance: _data.minSolBalance,
					// athPercent: _data.athPercent,
					isPaused: _data.isPaused,
					status: _data.status,
					subscriptionCreatedAt: _data.subscriptionCreatedAt,
					subscriptionExpiresIn: _data.subscriptionExpiresIn,
					membershipId: _data.membershipId,
					email: _data.email
				},
				// $setOnInsert: {
				// 	// name: _data.name,
				// 	chatId: _data.chatId
				// }
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

export const getExsitMembershipId = async (membershipId: string) => {
	try {
		const r = await DClients.findOne({ membershipId });
		if (!!r?._id) return true;
	} catch (error) {
		console.log("Get exsit membership id error: ", error);
	}
	return false;
}

export const checkMembershipData = async (chatId: number, email: string) => {
	try {
		const clientData = await getClientData(chatId);
		if (!!clientData && !!clientData.membershipId && clientData.subscriptionExpiresIn >= currentTime()) {
			return true;
		}

		const { created_at, renewal_period_end, membership_id } = await checkMembershipWithEmail(email);

		if (!!created_at && !!renewal_period_end && !!membership_id) {
			const _exist = await getExsitMembershipId(membership_id);
			if (!_exist) {
				await updateClientData({
					chatId,
					winRate: clientData?.winRate || defaultWinRate,
					minVolume: clientData?.minVolume || defaultMinVolume,
					minSolBalance: clientData?.minSolBalance || defaultMinSolBalance,
					status: BotStatus.UsualMode,
					isPaused: clientData?.isPaused || false,
					email: email.toLowerCase(),
					subscriptionCreatedAt: created_at,
					subscriptionExpiresIn: renewal_period_end,
					membershipId: membership_id
				});

				console.log("Added membership data correctly ==========>", chatId, email, created_at, renewal_period_end, membership_id);
				return true;
			}
		}

	} catch (error) {
		console.log("Check membership data error: ", error);
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

export const getTraderByWinRate = async (winRate: number, minVolume: number, minSolBalance: number, excludeTrader: string[]/* , page: number, countPerPage: number */) => {
	try {
		let _match = {}
		if (!!excludeTrader.length) {
			_match = {
				trader: { $nin: excludeTrader }
			}
		}
		const r = await DTransactions.aggregate([
			{
				$match: _match
			},
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
					},
					createdSum: {
						$sum: "$created"
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
					},
					created: {
						$cond: {
							if: { $ne: ['$totalTransaction', 0] },
							then: { $divide: ['$createdSum', '$totalTransaction'] },
							else: 0
						}
					},
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
				$sort: { created: -1, winRate: -1 }
			},
			{
				$skip: 0,
			},
			{
				$limit: 2
			}
			// {
			// 	$facet: {
			// 		paginatedResults: [{ $skip: (page - 1) * countPerPage }, { $limit: countPerPage }],
			// 		totalCount: [
			// 			{
			// 				$count: 'count'
			// 			}
			// 		]
			// 	}
			// }
		]).toArray();

		let trader: RequestTraderDataType | null = null;

		if (!!r?.length) {
			for (let _trader of r) {
				if (!_trader?._id) continue;
				const solBalance = await getUserSolBalance(_trader._id);
				if (solBalance < minSolBalance) continue;
				const _latestToken = await DTransactions.find({ trader: _trader._id, isBuy: true }).sort({ created: -1 }).skip(0).limit(1).toArray();
				const address = _latestToken?.[0]?.tokenAddress || "";
	
				const _token = await DTokens.findOne({ address });
				trader = {
					_id: _trader._id,
					totalTransaction: _trader.totalTransaction || 0,
					totalVolume: _trader.totalVolume || 0,
					winTransaction: _trader.winTransaction || 0,
					winRate: _trader.winRate || 0,
					solBalance,
					latestToken: _token
				}
				break;
			}
		}

		return trader;
	} catch (error) {
		console.log("Get trader by win rate error: ", error);
	}
	return null;
}