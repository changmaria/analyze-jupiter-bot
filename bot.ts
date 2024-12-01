import TelegramBot from 'node-telegram-bot-api';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import dotenv from 'dotenv';

import {
	onSettings,
	onStart,
	setMinimumVolume,
	setWinRate,
	showTopTradersMessage,
	onBuyBot,
	onCancelSubscription,
	checkSubscription,
	setBotPauseStatus,
	confirmPremium,
	checkMembershipEmail
} from './utils/bot';
import { isNumber, validateEmail } from './utils/helper';
import { BotClient, BotStatus } from './utils/interface';
import { getClientData, getClients, getTraderByWinRate, open, updateClientData, updateMembershipsData } from "./utils/mongodb";

dotenv.config();

const bot_token = process.env.bot_token != undefined ? process.env.bot_token : "";
const bot = new TelegramBot(bot_token, { polling: true });

let latestTopTrader: { [userId: number]: string } = {};
let timer_index = 0;

// const traderCountPerPage = 3;
// const tokenCountPerPage = 5;

bot.setMyCommands([
	{ command: '/start', description: 'start the bot' },
	{ command: '/admin', description: 'modify the filter settings' },
	// { command: '/confirm_premium', description: 'confirm premium after whop payment' },
])

// bot.onText(/\/login/, (msg) => {
// 	onLogin(msg, bot);
// });

bot.onText(/\/start/, async (msg) => {
	// if (msg.text?.startsWith('/start code=')) {
	// 	const code = msg.text?.replace('/start code=', '');
	// 	console.log("Start-code============> ", code);
	// 	if (!!code && !!msg.chat.username) {
	// 		await onVerifyCode(msg, bot, code);
	// 		return;
	// 	}
	// }
	const res = await checkSubscription(msg, bot);
	if (!res) return;
	await onStart(msg, bot);
})

bot.onText(/\/admin/, async (msg) => {
	const res = await checkSubscription(msg, bot);
	if (!res) return;
	await onSettings(msg, bot);
})

bot.onText(/\/confirm_premium/, async (msg) => {
	await confirmPremium(msg, bot);
})

bot.on('callback_query', async (callbackQuery) => {
	const message: any = callbackQuery.message;
	const _cmd = callbackQuery.data || '';

	if (_cmd !== 'confirmPremium' && _cmd !== 'buyBot' && _cmd !== 'cancelSubscription') {
		const res = await checkSubscription(message, bot);
		if (!res) return bot.answerCallbackQuery(callbackQuery.id);
	}

	if (_cmd == 'setWinRate') {
		await setWinRate(message, bot);
	} else if (_cmd == 'setMinimumVolume') {
		await setMinimumVolume(message, bot);
	} else if (_cmd == 'confirmPremium') {
		await confirmPremium(message, bot);
	} else if (_cmd == 'setBotPauseStatus') {
		await setBotPauseStatus(message, bot);
	} else if (_cmd == 'buyBot') {
		await onBuyBot(message, bot);
		// } else if (_cmd == 'addBot') {
		// 	await addBot(message, bot, 0, 0);
	} else if (_cmd == 'cancelSubscription') {
		await onCancelSubscription(message, bot);
	} else if (_cmd === 'admin') {
		await onSettings(message, bot);
	} else if (_cmd === 'start') {
		await onStart(message, bot);
	} else if (_cmd === 'topTraders') {
		await sendDataToBot('top-trader', message.from?.id || 0, 0);
	} else if (_cmd === 'fallingTokens') {
		// await sendDataToBot('falling-token', message.from?.id || 0, 1, 0);
	} else if (_cmd?.startsWith('previousPageOfTraders')) {
		const page = Number(_cmd.replace('previousPageOfTraders_', '')) || 0;
		if (!!page && page - 1 >= 1) {
			await sendDataToBot('top-trader', message.from?.id || 0, message?.message_id);
		}
	} else if (_cmd?.startsWith('nextPageOfTraders')) {
		const page = Number(_cmd.replace('nextPageOfTraders_', '')) || 0;
		if (!!page) {
			await sendDataToBot('top-trader', message.from?.id || 0, message?.message_id);
		}
	} else if (_cmd?.startsWith('previousPageOfTokens')) {
		// const page = Number(_cmd.replace('previousPageOfTokens_', '')) || 0;
		// if (!!page && page - 1 >= 1) {
		// 	await sendDataToBot('falling-token', message.from?.id || 0, message?.message_id);
		// }
	} else if (_cmd?.startsWith('nextPageOfTokens')) {
		// const page = Number(_cmd.replace('nextPageOfTokens_', '')) || 0;
		// if (!!page) {
		// 	await sendDataToBot('falling-token', message.from?.id || 0, page + 1, message?.message_id);
		// }
	}
	bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('message', async (msg) => {
	if (msg.text == undefined || (!!msg.entities?.length && msg.entities?.[0].type === 'bot_command')) return;

	if (!msg.from?.id) return;
	const clientData: BotClient = await getClientData(msg.from.id);

	if (!!clientData && clientData.status === BotStatus.UsualMode) return;

	if (clientData?.status !== BotStatus.InputEmail) {
		const res = await checkSubscription(msg, bot);
		if (!res) return;
	}
	if (clientData.status == BotStatus.InputWinRate) {
		if (!isNumber(msg.text)) {
			await bot.sendMessage(msg.chat.id, 'You have to input number as Win Rate. Not Correct Format!!');
			return;
		}
		clientData.winRate = Math.abs(parseInt(msg.text));
		clientData.status = BotStatus.UsualMode;
		await updateClientData(clientData);
		await bot.sendMessage(msg.chat.id, `Win Rate is updated successfully. ${clientData.winRate}%`);
	} else if (clientData.status == BotStatus.InputMinVolume) {
		if (!isNumber(msg.text)) {
			await bot.sendMessage(msg.chat.id, 'You have to input number as Minimum Volume. Not Correct Format!!');
			return;
		}
		clientData.minVolume = Math.abs(parseInt(msg.text));
		clientData.status = BotStatus.UsualMode;
		await updateClientData(clientData);
		await bot.sendMessage(msg.chat.id, `Minimum Volume is updated successfully. $${clientData.minVolume}`);
	} else if (clientData.status === BotStatus.InputEmail) {
		if (!msg.text || !validateEmail(msg.text)) {
			await bot.sendMessage(msg.chat.id, 'Please enter a valid email address.');
			return;
		}
		await checkMembershipEmail(msg, bot);
	}
	//  else if (clientData.status == BotStatus.InputATHPercent) {
	// if (!isNumber(msg.text)) {
	// 	await bot.sendMessage(msg.chat.id, 'You have to input number as ATH Percent. Not Correct Format!!');
	// 	return;
	// }
	// clientData.athPercent = Math.abs(parseInt(msg.text));
	// clientData.status = BotStatus.UsualMode;
	// await updateClientData(clientData);
	// await bot.sendMessage(msg.chat.id, `ATH Percent is updated successfully. ${clientData.athPercent}%`);
	// }
})

const sendDataToBot = async (type: 'top-trader' | 'falling-token', userId: number, /* page: number = 1, */ messageId: number) => {
	try {
		const clientData = await getClientData(userId);

		if (!clientData) return;

		if (type == 'top-trader') {

			const trader = await getTraderByWinRate(
				clientData.winRate / 100,
				(clientData.minVolume * LAMPORTS_PER_SOL) / 175
			);

			if (!!trader) {
				if (!!latestTopTrader?.[clientData.userId]) {
					if (latestTopTrader[clientData.userId] !== trader._id) {
						latestTopTrader[clientData.userId] = trader._id;
					}
				} else {
					latestTopTrader = { ...latestTopTrader, [clientData.userId]: trader._id };
				}
			}

			await showTopTradersMessage(bot, trader, /* count,  */clientData, /* page, traderCountPerPage,  */messageId);
		}
		// if (type === 'falling-token') {

		// 	const _tokens = await getTokensByATHPercent(clientData.athPercent, page, tokenCountPerPage);
		// 	const _count = await getTokensCountByATHPercent(clientData.athPercent);

		// 	await showFallingTokenMessage(bot, _tokens, _count, clientData.chatId, page, tokenCountPerPage, messageId);
		// }
	} catch (error) {
		console.log("Send data to bot error: ", error);
	}
}

const sendUpdatesToBot = async () => {
	try {

		timer_index++;
		if (timer_index === 3) {
			console.log("Update memberships data ========>");
			await updateMembershipsData();
			timer_index = 0;
		}

		const clients = await getClients();
		if (!clients.length) return;

		for (let i of clients) {
			const trader = await getTraderByWinRate(
				i.winRate / 100,
				(i.minVolume * LAMPORTS_PER_SOL) / 175,
			);

			// const _tokens = await getTokensByATHPercent(i.athPercent, 1, tokenCountPerPage);
			// const _count = await getTokensCountByATHPercent(i.athPercent);

			if (/* !_tokens.length ||  */!trader) continue;
			
			if (!!latestTopTrader?.[i.userId]) {
				if (latestTopTrader[i.userId] === trader._id) {
					continue;
				} else {
					latestTopTrader[i.userId] = trader._id;
				}
			} else {
				latestTopTrader = { ...latestTopTrader, [i.userId]: trader._id };
			}
			await showTopTradersMessage(bot, trader, /* count,  */i, /* 1, traderCountPerPage, */ 0);

			// await showFallingTokenMessage(bot, _tokens, _count, i.chatId, 1, tokenCountPerPage, 0);
		}
	} catch (error) {
		console.log("Send updates to bot error: ", error);
	}
}

const startRunning = async () => {
	setInterval(async () => {
		try {
			await sendUpdatesToBot();
		} catch (err) {
			console.log("sending token error ===>", err);
		}
	}, 1000 * 60 * 10);
}

open().then(async () => {
	try {
		startRunning();
	} catch (error) {
		console.log("Mongodb open is failed error: ", error);
		process.exit(1)
	}
})