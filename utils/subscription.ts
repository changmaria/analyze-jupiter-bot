import axios from "axios";
import dotenv from 'dotenv';
import { defaultMinVolume, defaultWinRate, getClientData, getExsitSubscriptionCode, updateClientData } from "./mongodb";
import { BotStatus } from "./interface";
import { currentTime } from "./helper";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

export const verifySubscriptionCode = async (code: string, tgUsername: string, chatId: number) => {
	try {
		if (!!code) {
			const requestOptions = {
				method: "POST",
				url: "https://api.whop.com/v5/oauth/token",
				headers: {
					"Content-Type": "application/json",
				},
				data: {
					grant_type: "authorization_code",
					code: code,
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
					redirect_uri: "https://sword-tracker-bot.onrender.com/whop"
				},
			};

			const res = await axios.request(requestOptions);

			if (res.status === 200 && !!res.data?.access_token) {
				const _data = res.data;

				console.log("verify-subscription res =============> ", _data);

				const _exist_token = await getExsitSubscriptionCode(_data.access_token);
				console.log("_exist_token============> ", _exist_token);

				if (!_exist_token) {
					const client = await getClientData(tgUsername);

					const created_at = Number(_data?.created_at) || currentTime();
					const one_month = 60 * 60 * 24 * 31
					const expires_in = !!_data?.expires_in ? (Number(_data.expires_in) > one_month ? one_month : Number(_data.expires_in)) : one_month;

					await updateClientData({
						name: tgUsername,
						winRate: client?.winRate || defaultWinRate,
						minVolume: client?.minVolume || defaultMinVolume,
						// athPercent: defaultATHPercent,
						status: client?.status || BotStatus.UsualMode,
						isPaused: client?.isPaused === undefined ? false : client?.isPaused,
						chatId: chatId,
						subscriptionCreatedAt: created_at,
						subscriptionExpiresIn: expires_in + created_at,
						accessToken: _data.access_token
					})
					console.log("Added client data correctly============>", _data.access_token, expires_in, created_at)
					return true;
				}
			}
		}
	} catch (error) {
		console.log("Verify subscription code error: ", error);
	}
	return false;
}

export const checkAccess = async (accessToken: string) => {
	try {
		const res = await axios.get(`https://api.whop.com/api/v5/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		if (res.status === 200 && !!res.data?.id) {
			return true;
		}
	} catch (error) {
		console.log("Check access error: ", error);
	}
	return false;
}