import TelegramBot from 'node-telegram-bot-api';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
// import express, { Express, Request, Response } from "express";
// import bodyParser from "body-parser";
import { onLogin, onSettings, onStart, onStop, addBot, setATHPercent, setMinimumVolume, setWinRate, showTopTradersMessage, showFallingTokenMessage, onBuyBot, onCancelSubscription, checkSubscription, onVerifyCode } from './utils/bot';
import { isNumber } from './utils/helper';
import { BotClient, BotStatus, RequestTraderDataType } from './utils/interface';
import { getClientData, getTokensByATHPercent, getTokensCountByATHPercent, getTradersByWinRate, open, updateClientData } from "./utils/mongodb";

const bot_token = "7832700088:AAH3HUINot15J8A3S7dtHnZIxpQfGvjVrBQ";
const bot = new TelegramBot(bot_token, { polling: true });

const countPerPage = 10;

bot.setMyCommands([
	{ command: '/start', description: 'start the bot' },
	{ command: '/admin', description: 'modify the filter settings' }
])

bot.onText(/\/login/, (msg) => {
	onLogin(msg, bot);
});

bot.onText(/\/stop/, (msg) => {
	onStop(msg, bot);
})

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
	} else if (_cmd == 'setATHPercent') {
		setATHPercent(message, bot);
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
		await sendDataToBot('top-trader', message?.chat?.username, 1, 0);
	} else if (_cmd === 'fallingTokens') {
		await sendDataToBot('falling-token', message?.chat?.username, 1, 0);
	} else if (_cmd?.startsWith('previousPageOfTraders')) {
		const page = Number(_cmd.replace('previousPageOfTraders_', '')) || 0;
		if (!!page && page - 1 >= 1) {
			await sendDataToBot('top-trader', message?.chat?.username, page - 1, message?.message_id);
		}
	} else if (_cmd?.startsWith('nextPageOfTraders')) {
		const page = Number(_cmd.replace('nextPageOfTraders_', '')) || 0;
		if (!!page) {
			await sendDataToBot('top-trader', message?.chat?.username, page + 1, message?.message_id);
		}
	} else if (_cmd?.startsWith('previousPageOfTokens')) {
		const page = Number(_cmd.replace('previousPageOfTokens_', '')) || 0;
		if (!!page && page - 1 >= 1) {
			await sendDataToBot('falling-token', message?.chat?.username, page - 1, message?.message_id);
		}
	} else if (_cmd?.startsWith('nextPageOfTokens')) {
		const page = Number(_cmd.replace('nextPageOfTokens_', '')) || 0;
		if (!!page) {
			await sendDataToBot('falling-token', message?.chat?.username, page + 1, message?.message_id);
		}
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
		clientData.winRate = parseInt(msg.text);
		clientData.status = BotStatus.UsualMode;
		await updateClientData(clientData);
		await bot.sendMessage(msg.chat.id, `Win Rate is updated successfully. ${clientData.winRate}%`);
	} else if (clientData.status == BotStatus.InputMinVolume) {
		if (!isNumber(msg.text)) {
			await bot.sendMessage(msg.chat.id, 'You have to input number as Minimum Volume. Not Correct Format!!');
			return;
		}
		clientData.minVolume = parseInt(msg.text);
		clientData.status = BotStatus.UsualMode;
		await updateClientData(clientData);
		await bot.sendMessage(msg.chat.id, `Minimum Volume is updated successfully. $${clientData.minVolume}`);
	} else if (clientData.status == BotStatus.InputATHPercent) {
		if (!isNumber(msg.text)) {
			await bot.sendMessage(msg.chat.id, 'You have to input number as ATH Percent. Not Correct Format!!');
			return;
		}
		clientData.athPercent = parseInt(msg.text);
		clientData.status = BotStatus.UsualMode;
		await updateClientData(clientData);
		await bot.sendMessage(msg.chat.id, `ATH Percent is updated successfully. ${clientData.athPercent}%`);
	}
})

const sendDataToBot = async (type: 'top-trader' | 'falling-token', tgUserName: string, page: number = 1, messageId: number) => {

	const clientData = await getClientData(tgUserName);
	if (!clientData || clientData.status != BotStatus.UsualMode) return;

	if (type == 'top-trader') {

		const { traders, count } = await getTradersByWinRate(
			clientData.winRate / 100,
			(clientData.minVolume * LAMPORTS_PER_SOL) / 175,
			page,
			countPerPage
		);

		await showTopTradersMessage(bot, traders as RequestTraderDataType[], count, clientData.chatId, page, countPerPage, messageId);
	}
	if (type === 'falling-token') {

		const _tokens = await getTokensByATHPercent(clientData.athPercent, page, countPerPage);
		const _count = await getTokensCountByATHPercent(clientData.athPercent);

		if (!_tokens.length) return;

		await showFallingTokenMessage(bot, _tokens, _count, clientData.chatId, page, countPerPage, messageId);
	}
}

// const app: Express = express();

open().then(async () => {
	try {
		// app.use(bodyParser.urlencoded({ extended: false }));
		// app.get("/whop", (req: Request, res: Response) => {
		// 	const code = req.url.replace('/whop?', '');
		// 	let _url = ''
		// 	if (!code) {
		// 		_url = 'https://t.me/jupitertrackkbot';
		// 	} else {
		// 		_url = `https://t.me/jupitertrackkbot?start=${code}`;
		// 	}
		// 	return res.redirect(_url);
		// });
		
		// const port = 3000;
		// app.listen(port, () => {
		// 	console.log(`Express is running at port: ${port}`);
		// });
	} catch (error) {
		console.log("Mongodb open is failed error: ", error);
		process.exit(1)
	}
})