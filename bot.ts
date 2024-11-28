import TelegramBot from 'node-telegram-bot-api';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import dotenv from 'dotenv';
import { onLogin, onSettings, onStart, addBot, setMinimumVolume, setWinRate, showTopTradersMessage, onBuyBot, onCancelSubscription, checkSubscription, onVerifyCode, setBotPauseStatus } from './utils/bot';
import { isNumber } from './utils/helper';
import { BotClient, BotStatus } from './utils/interface';
import { getClientData, getClients, getTraderByWinRate, open, updateClientData } from "./utils/mongodb";

dotenv.config();

const bot_token = process.env.bot_token != undefined ? process.env.bot_token : "";
const bot = new TelegramBot(bot_token, { polling: true });

// const traderCountPerPage = 3;
// const tokenCountPerPage = 5;

bot.setMyCommands([
	{ command: '/start', description: 'start the bot' },
	{ command: '/admin', description: 'modify the filter settings' },
])

bot.onText(/\/login/, (msg) => {
	onLogin(msg, bot);
});

bot.onText(/\/start/, async (msg) => {
	if (msg.text?.startsWith('/start code=')) {
		const code = msg.text?.replace('/start code=', '');
		if (!!code && !!msg.chat.username) {
			await onVerifyCode(msg, bot, code);
			return;
		}
	}
	const res = await checkSubscription(msg, bot);
	if (!res) return;
	await onStart(msg, bot);
})

bot.onText(/\/admin/, async (msg) => {
	const res = await checkSubscription(msg, bot);
	if (!res) return;
	await onSettings(msg, bot);
})

bot.on('callback_query', async (callbackQuery) => {
	const message: any = callbackQuery.message;
	const _cmd = callbackQuery.data || '';

	if (_cmd !== 'addBot' && _cmd !== 'buyBot' && _cmd !== 'cancelSubscription') {
		const res = await checkSubscription(message, bot);
		if (!res) return bot.answerCallbackQuery(callbackQuery.id);
	}

	if (_cmd == 'setWinRate') {
		await setWinRate(message, bot);
	} else if (_cmd == 'setMinimumVolume') {
		await setMinimumVolume(message, bot);
	// } else if (_cmd == 'setATHPercent') {
		// setATHPercent(message, bot);
	} else if (_cmd == 'setBotPauseStatus') {
		setBotPauseStatus(message, bot);
	} else if (_cmd == 'buyBot') {
		await onBuyBot(message, bot);
	} else if (_cmd == 'addBot') {
		await addBot(message, bot, 0, 0);
	} else if (_cmd == 'cancelSubscription') {
		await onCancelSubscription(message, bot);
	} else if (_cmd === 'admin') {
		await onSettings(message, bot);
	} else if (_cmd === 'start') {
		await onStart(message, bot);
	} else if (_cmd === 'topTraders') {
		await sendDataToBot('top-trader', message?.chat?.username, 0);
	} else if (_cmd === 'fallingTokens') {
		// await sendDataToBot('falling-token', message?.chat?.username, 1, 0);
	} else if (_cmd?.startsWith('previousPageOfTraders')) {
		const page = Number(_cmd.replace('previousPageOfTraders_', '')) || 0;
		if (!!page && page - 1 >= 1) {
			await sendDataToBot('top-trader', message?.chat?.username, message?.message_id);
		}
	} else if (_cmd?.startsWith('nextPageOfTraders')) {
		const page = Number(_cmd.replace('nextPageOfTraders_', '')) || 0;
		if (!!page) {
			await sendDataToBot('top-trader', message?.chat?.username, message?.message_id);
		}
	} else if (_cmd?.startsWith('previousPageOfTokens')) {
		// const page = Number(_cmd.replace('previousPageOfTokens_', '')) || 0;
		// if (!!page && page - 1 >= 1) {
		// 	await sendDataToBot('falling-token', message?.chat?.username, message?.message_id);
		// }
	} else if (_cmd?.startsWith('nextPageOfTokens')) {
		// const page = Number(_cmd.replace('nextPageOfTokens_', '')) || 0;
		// if (!!page) {
		// 	await sendDataToBot('falling-token', message?.chat?.username, page + 1, message?.message_id);
		// }
	}
	bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('message', async (msg) => {

	if (msg.entities != undefined || msg.text == undefined) return;

	if (msg.chat.username == undefined) return;

	const res = await checkSubscription(msg, bot);
	if (!res) return;

	const clientData: BotClient = await getClientData(msg.chat.username);

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

const sendDataToBot = async (type: 'top-trader' | 'falling-token', tgUserName: string, /* page: number = 1, */ messageId: number) => {
	try {
		const clientData = await getClientData(tgUserName);

		if (!clientData || clientData.status != BotStatus.UsualMode) return;

		if (type == 'top-trader') {

			const trader = await getTraderByWinRate(
				clientData.winRate / 100,
				(clientData.minVolume * LAMPORTS_PER_SOL) / 175
			);

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

			// await showFallingTokenMessage(bot, _tokens, _count, i.chatId, 1, tokenCountPerPage, 0);
			await showTopTradersMessage(bot, trader, /* count,  */i, /* 1, traderCountPerPage, */ 0);
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