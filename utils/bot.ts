import TelegramBot from "node-telegram-bot-api";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { promises as fs } from 'fs';
import path from 'path';

import { BotClient, BotStatus, RequestTraderDataType, TokenDataType, Trader } from "./interface";
import { currentTime, formatBigNumber } from "./helper";
import { addClient, getClientData, updateClientData } from "./mongodb";
import { verifySubscriptionCode } from "./subscription";

const connection: Connection = new Connection('https://proportionate-distinguished-bush.solana-mainnet.quiknode.pro/23d40a5fef0e147c06129a62e0cc0b975f38fd42');
const imagePath = path.normalize(`${path.normalize(`${__dirname}/../../`)}/assets/swordbanner.png`);

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

export const onSettings = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (msg.chat.username == undefined) return;

		const clientData = await getClientData(msg.chat.username) as BotClient;
		if (!clientData.name) return;

		const imageData = await fs.readFile(imagePath);

		await bot.sendPhoto(
			msg.chat.id,
			imageData,
			{
				reply_markup: {
					inline_keyboard: [
						[
							{ text: `Win Rate ${clientData.winRate.toFixed(0)}%`, callback_data: 'setWinRate' },
							{ text: `Min Volume $${clientData.minVolume.toFixed(0)}`, callback_data: 'setMinimumVolume' },
							{ text: !clientData.isPaused ? '❌ Pause bot' : '🚀 Start bot', callback_data: 'setBotPauseStatus' },
						],
						[
							// { text: `ATH ${clientData.athPercent.toFixed(0)}%`, callback_data: 'setATHPercent' },
						],
						[
							{ text: 'Back', callback_data: 'start' }
						]
					]
				}
			}
		);
	} catch (error) {
		console.log("settings error: ", error);
	}
}

export const onStart = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (msg.chat.username == undefined) return;

		const client = await getClientData(msg.chat.username);

		if (!client.name) {
			const status = await addClient(msg.chat.username, msg.chat.id);
			if (!status) return;
		}

		const imageData = await fs.readFile(imagePath);
		const _keyboards = [
			[
				{ text: '🏆 Top Traders', callback_data: 'topTraders' },
				{ text: '⚙️ Settings', callback_data: 'admin' },
				// { text: '👎 Falling Tokens', callback_data: 'fallingTokens' }
			],
			[
				{ text: '🔄 BullX', url: 'https://bullx.io/veutino' },
			],
		]

		let reply_markup;

		if (client.subscription_expires_in < currentTime()) {
			reply_markup = {
				inline_keyboard: [
					..._keyboards,
					[
						{ text: 'Buy Bot 🏆: 47€/month', callback_data: 'buyBot' }
					]
				]
			}
		} else {
			reply_markup = {
				inline_keyboard: _keyboards
			}
		}

		await bot.sendPhoto(
			msg.chat.id,
			imageData,
			{
				caption: `👋👋_Welcome ${msg.chat.first_name}!_👋👋\n\n \*⭣ How to use this bot? ⭣*\n\n 1. Use /start command to run bot.🚀\n\n 2. Use /admin command to set settings.\n\n\n _Bot is already running!!!_`,
				parse_mode: 'Markdown',
				reply_markup,
			}
		);
	} catch (error) {
		console.log("start bot error: ", error);
	}
}

export const onBuyBot = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (msg.chat.username == undefined) return;

		const reply_markup = {
			inline_keyboard: [
				[
					{ text: 'Yes', url: 'https://whop.com/sword-15' },
					{ text: 'No', callback_data: 'cancelSubscription' }
				],
				[
					{ text: 'Back', callback_data: 'start' }
				]
			]
		}

		let message = '*Jupiter Track Bot - Full Acces* 🏆\n*47€* for One Month\n\nUnlock premium access to Jupiter Track Bot for just 47€/month and gain exclusive insights into the Solana ecosystem.';

		await bot.sendMessage(
			msg.chat.id,
			message,
			{
				parse_mode: 'Markdown',
				reply_markup,
			}
		);
	} catch (error) {
		console.log("Buy bot error: ", error);
	}
}

export const onCancelSubscription = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (msg.chat.username == undefined) return;
		const messageId = msg.message_id;
		const chatId = msg.chat.id;

		const reply_markup = {
			inline_keyboard: [
				[
					{ text: 'Back', callback_data: 'start' }
				]
			]
		}

		let message = 'The operation has been aborted, no actions will be taken.';

		await bot.editMessageText(
			message,
			{
				message_id: messageId,
				chat_id: chatId,
				parse_mode: 'Markdown',
				reply_markup
			}
		);
	} catch (error) {
		console.log("Cancel subscription error: ", error);
	}
}

export const onLogin = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		const chatId = msg.chat.id;

		const keyboard = {
			reply_markup: {
				keyboard: [
					[{ text: 'Dashboard' }],
				],
				resize_keyboard: true,
				one_time_keyboard: true,
			},
		};

		bot.sendMessage(chatId, 'Welcome! Click the button below to access your dashboard:', keyboard);
	} catch (error) {
		console.log("login error: ", error);
	}
}

export const setBotPauseStatus = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (!msg.chat.username) return;
		const clientData = await getClientData(msg.chat.username) as BotClient;
		if (!clientData.name) return;

		if (clientData.isPaused) {
			clientData.isPaused = false;
			await updateClientData(clientData);
			await bot.sendMessage(msg.chat.id, `The bot was started successfully.`);
		} else {
			clientData.isPaused = true;
			await updateClientData(clientData);
			await bot.sendMessage(msg.chat.id, `The bot has been successfully paused.`);
		}
	} catch (error) {
		console.log("set real time error: ", error);
	}
}

export const setWinRate = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (!msg.chat.username) return;
		const clientData = await getClientData(msg.chat.username) as BotClient;
		if (!clientData.name) return;
		await bot.sendMessage(msg.chat.id, `Please input the win rate for filtering. Now Win Rate is ${clientData.winRate}%`)
		clientData.status = BotStatus.InputWinRate;
		await updateClientData(clientData);
	} catch (error) {
		console.log("Set win rate error: ", error);
	}
}

export const setMinimumVolume = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (!msg.chat.username) return;
		const clientData = await getClientData(msg.chat.username) as BotClient;
		if (!clientData.name) return;
		await bot.sendMessage(msg.chat.id, `Please input the Minimum Volume for filtering. Now Minimum Volume is $${clientData.minVolume}`)
		clientData.status = BotStatus.InputMinVolume;
		await updateClientData(clientData);
	} catch (error) {
		console.log("Set minimum volume error: ", error);
	}
}

export const setATHPercent = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (!msg.chat.username) return;
		const clientData = await getClientData(msg.chat.username) as BotClient;
		if (!clientData.name) return;
		await bot.sendMessage(msg.chat.id, `Please input the ATH Percent for filtering. Now ATH Percent is ${clientData.athPercent}%`);
		clientData.status = BotStatus.InputATHPercent;
		await updateClientData(clientData);
	} catch (error) {
		console.log("Set ATH percent error: ", error);
	}
}

export const addBot = async (msg: TelegramBot.Message, bot: TelegramBot, subscription_created_at: number, subscription_expires_in: number) => {
	try {
		if (!msg.chat.username) return;
		const status = await addClient(msg.chat.username, msg.chat.id);
		if (status) bot.sendVideo(
			msg.chat.id,
			'https://media.tenor.com/1IPOZiZ6Z4AAAAAM/congratulations.gif',
			{
				caption: `👏👏👏👏👏👏👏👏👏👏👏👏👏👏👏\n\n _Let's become success traders together!!!_\n\n ⚡⚡⚡Bot is already running!⚡⚡⚡`,
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🏆 Top Traders', callback_data: 'topTraders' },
							{ text: '⚙️ Settings', callback_data: 'admin' },
							// { text: '👎 Falling Tokens', callback_data: 'fallingTokens' }
						],
						[
							{ text: '🔄 BullX', url: 'https://bullx.io/veutino' },
						],
						[
							{ text: 'Buy Bot 🏆: 47€/month', callback_data: 'buyBot' }
						]
					]
				}
			}
		);
	} catch (error) {
		console.log("Add bot error: ", error);
	}
}

const sliceAddress = (address: string) => {
	return `${address.slice(0, 5)}...${address.slice(-5)}`
}

export const showTopTradersMessage = async (bot: TelegramBot, traders: RequestTraderDataType[], totalCount: number, chatId: number, page: number, countPerPage: number, messageId: number) => {
	try {
		const totalPage = (totalCount % countPerPage === 0) ? totalCount / countPerPage : Math.floor(totalCount / countPerPage) + 1;
		let message = '🏆🏆🏆Good Traders🏆🏆🏆\n\n';

		for (let i = 0; i < traders.length; i++) {
			let token_message = '';
			const _t = traders[i].latestToken;
			if (!!_t?.address) {
				token_message += (
					`\n\n💊 **${_t.name || "Unknown"}** (**${_t.symbol || "Unknown"}**)\n` +
					'  ├ `' +
					`${_t.address}` +
					'`\n' +
					`  └ 🔴 [Solscan](https://solscan.io/address/${_t.address})  ` +
					`|  🟣 [Coingekco](https://www.coingecko.com/en/coins/${_t.coinGeckoId})  ` +
					`|  👁️ ${_t.watchlistUsers}` +
					'\n\n📊 **Token Stats**' +
					'\n  ├ `USD:`   ' +
					`$${formatBigNumber(_t.price || 0)}` +
					'\n  ├ `MC:`     ' +
					`$${formatBigNumber(_t.marketCap || 0)}` +
					'\n  ├ `VOL:`   ' +
					`$${formatBigNumber(_t.volume || 0)}` +
					'\n  ├ `LP:`     ' +
					`$${formatBigNumber(_t.lp || 0)}` +
					'\n  ├ `1H:`     ' +
					`${_t.price1HPercent > 0 ? '+' : ''}${(_t.price1HPercent || 0).toFixed(0)}%` +
					'\n  └ `ATH:`   ' +
					`$${formatBigNumber(_t.ath || 0)} (-${((_t.ath - _t.price) / _t.ath * 100).toFixed(0)}%)` +
					'\n\n🔗Links\n  └ '
				);
				if (!!_t.telegram) {
					token_message += `[TG](https://t.me/${_t.telegram})`;
				}
				if (!!_t.twitter) {
					if (!!_t.telegram) token_message += ' • '
					token_message += `[𝕏](https://twitter.com/${_t.twitter})`;
				}
				if (!!_t.website) {
					if (!!_t.telegram || !!_t.twitter) token_message += ' • '
					token_message += `[Web](${_t.website})`;
				}
				if (!_t.telegram && !_t.twitter && !_t.website) {
					token_message += 'N/A ‼️'
				}
			} else {
				token_message += '\n  └ N/A ‼️';
			}
			const _balance = await getUserSolBalance(traders[i]._id);
			message += ('👜 **Wallet** 👇\n' +
				'  ├ `' +
				`${traders[i]._id}` +
				'`\n' +
				`  └ 🔴 [Solscan](https://solscan.io/address/${traders[i]._id})` +
				token_message +
				'\n\n📈 **Detail**' +
				'\n  ├ `Win Rate:`                ' +
				`${(traders[i].winTransaction / traders[i].totalTransaction * 100).toFixed(0)}%` +
				'\n  ├ `Trading Volume:`   ' +
				`$${formatBigNumber((traders[i].totalVolume / LAMPORTS_PER_SOL * 175))}` +
				'\n  └ `SOL Balance:`          ' +
				`${Math.round(_balance * 1e3) / 1e3}SOL\n\n\n`);
		}
		if (!!traders.length) {
			message += `_Current page ${page} of ${totalPage} pages_`;
		} else {
			message += 'There is no top traders yet.';
		}

		const reply_markup = {
			inline_keyboard: [
				[
					{ text: '<<', callback_data: page - 1 >= 1 ? `previousPageOfTraders_${page}` : 'page' },
					{ text: `${page}`, callback_data: 'page' },
					{ text: '>>', callback_data: page + 1 <= totalPage ? `nextPageOfTraders_${page}` : 'page' },
				],
				[
					{ text: '🔄 BullX', url: 'https://bullx.io/veutino' },
					{ text: 'Back', callback_data: 'start' },
				]
			]
		}

		if (!!messageId) {
			await bot.editMessageText(
				message,
				{
					message_id: messageId,
					chat_id: chatId,
					parse_mode: 'Markdown',
					reply_markup
				}
			);
		} else {
			await bot.sendMessage(
				chatId,
				message,
				{
					parse_mode: 'Markdown',
					reply_markup
				}
			)
		}
	} catch (error) {
		console.log("Show top traders message error: ", error);
	}
}

export const showFallingTokenMessage = async (bot: TelegramBot, tokenList: TokenDataType[], totalCount: number, chatId: number, page: number, countPerPage: number, messageId: number) => {
	try {
		const totalPage = (totalCount % countPerPage === 0) ? totalCount / countPerPage : Math.floor(totalCount / countPerPage) + 1;
		let message = '👎👎👎 _Falling Token_ 👎👎👎\n\n';

		for (let i = 0; i < tokenList.length; i++) {
			message += (`💊 **${tokenList[i].name}** (**${tokenList[i].symbol}**)\n` +
				'  ├ `' +
				`${tokenList[i].address}` +
				'`\n' +
				`  └ 🔴 [Solscan](https://solscan.io/address/${tokenList[i].address})  ` +
				`|  🟣 [Coingekco](https://www.coingecko.com/en/coins/${tokenList[i].coinGeckoId})  ` +
				`|  🟠 [BLX](https://bullx.io/terminal?address=${tokenList[i].address})  ` +
				`|  👁️ ${tokenList[i].watchlistUsers}` +
				'\n\n📊 **Token Stats**' +
				'\n  ├ `USD:`   ' +
				`$${formatBigNumber(tokenList[i].price || 0)}` +
				'\n  ├ `MC:`     ' +
				`$${formatBigNumber(tokenList[i].marketCap || 0)}` +
				'\n  ├ `VOL:`   ' +
				`$${formatBigNumber(tokenList[i].volume || 0)}` +
				'\n  ├ `LP:`     ' +
				`$${formatBigNumber(tokenList[i].lp || 0)}` +
				'\n  ├ `1H:`     ' +
				`${tokenList[i].price1HPercent > 0 ? '+' : ''}${(tokenList[i].price1HPercent || 0).toFixed(0)}%` +
				'\n  └ `ATH:`   ' +
				`$${formatBigNumber(tokenList[i].ath || 0)} (-${((tokenList[i].ath - tokenList[i].price) / tokenList[i].ath * 100).toFixed(0)}%)` +
				'\n\n🔗 **Links**\n  └ '
			);
			if (!!tokenList[i].telegram) {
				message += `[TG](https://t.me/${tokenList[i].telegram})`;
			}
			if (!!tokenList[i].twitter) {
				if (!!tokenList[i].telegram) message += ' • '
				message += `[𝕏](https://twitter.com/${tokenList[i].twitter})`;
			}
			if (!!tokenList[i].website) {
				if (!!tokenList[i].telegram || !!tokenList[i].twitter) message += ' • '
				message += `[Web](${tokenList[i].website})`;
			}
			if (!tokenList[i].telegram && !tokenList[i].twitter && !tokenList[i].website) {
				message += 'N/A ‼️'
			}

			message += '\n\n\n';
		}

		if (!!tokenList.length) {
			message += `_Current page ${page} of ${totalPage} pages_`;
		} else {
			message += 'There is no falling tokens.'
		}

		const reply_markup = {
			inline_keyboard: [
				[
					{ text: '<<', callback_data: page - 1 >= 1 ? `previousPageOfTokens_${page}` : 'page' },
					{ text: `${page}`, callback_data: 'page' },
					{ text: '>>', callback_data: page + 1 <= totalPage ? `nextPageOfTokens_${page}` : 'page' },
				],
				[
					{ text: 'Back', callback_data: 'start' },
				]
			]
		}

		if (!!messageId) {
			await bot.editMessageText(
				message,
				{
					message_id: messageId,
					chat_id: chatId,
					parse_mode: 'Markdown',
					reply_markup
				}
			);
		} else {
			await bot.sendMessage(
				chatId,
				message,
				{
					parse_mode: 'Markdown',
					reply_markup
				}
			)
		}
	} catch (error) {
		console.log("Show falling token message error: ", error);
	}
}

export const checkSubscription = async (msg: TelegramBot.Message, bot: TelegramBot) => {
	try {
		if (!msg.chat.username) return;
		const client_data = await getClientData(msg.chat.username);
		const now = currentTime();
		let caption = '';
		let bot_description = 'Meet the *Jupiter Track Bot*—your go-to tool for real-time insights on the Solana blockchain! It tracks falling tokens and successful traders to help you make smarter crypto decisions. Simplify your trading experience and boost your success with *Jupiter Track Bot*!'

		// if (!client_data || !client_data?.subscription) {
		// 	caption = `👋👋_Welcome ${msg.chat.first_name}!_👋👋\n\n${bot_description}\n\n\n ⭣⭣⭣ _You have to buy bot first_ ⭣⭣⭣`;
		// } else if ( now - client_data.subscription > EXPIRE_TIME ) {
		// 	caption = `👋👋_Welcome Back ${msg.chat.first_name}!_👋👋\n\n${bot_description}\n\n\n ⭣⭣⭣ _Your memebership is expired, please buy bot_ ⭣⭣⭣`;
		// } else {
		// 	return true;
		// }

		if (!client_data.name) {
			caption = `👋👋_Welcome ${msg.chat.first_name}!_👋👋\n\n${bot_description}\n\n\n ⭣⭣⭣ _You have to buy bot first_ ⭣⭣⭣`;
		} else {
			return true;
		}

		const imageData = await fs.readFile(imagePath);
		const reply_markup = {
			inline_keyboard: [
				[
					{ text: 'Add Bot', callback_data: 'addBot' }
				],
				[
					{ text: 'Buy Bot 🏆: 47€/month', callback_data: 'buyBot' }
				],
			]
		};

		await bot.sendPhoto(
			msg.chat.id,
			imageData,
			{
				caption,
				parse_mode: 'Markdown',
				reply_markup,
			}
		);
	} catch (error) {
		console.log("Check subscription error: ", error);
	}
	return false;
}

export const onVerifyCode = async (msg: TelegramBot.Message, bot: TelegramBot, code: string) => {
	try {
		if (!msg.chat.username) return;
		const verify = await verifySubscriptionCode(code, msg.chat.username, msg.chat.id);

		let message = '';

		if (verify) {
			message = '👋👋Congratulations, your subscription has been successfully completed!!!';
		} else {
			message = 'Sorry, your subscription code is invalid. Please try again.';
		}

		await bot.sendMessage(
			msg.chat.id,
			message,
			{
				parse_mode: 'Markdown',
			}
		);

	} catch (error) {
		console.log("Verify code error: ", error);
	}
}