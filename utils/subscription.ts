import axios from "axios";
import dotenv from 'dotenv';
import { defaultMinVolume, defaultWinRate, getClientData, getExsitSubscriptionCode, updateClientData } from "./mongodb";
import { BotStatus } from "./interface";

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
					redirect_uri: "https://jupitertrackkbot.onrender.com/whop"
				},
			};

			const res = await axios.request(requestOptions);

			console.log("verify-subscription res: ", res);

			if (res.status === 200 && !!res.data?.access_token) {
				const _data = res.data;
				const _exist_code = await getExsitSubscriptionCode(code);
				console.log("_exist_code: ", _exist_code)
				if (!_exist_code) {
					// const client = await getClientData(tgUsername);
					await updateClientData({
						name: tgUsername,
						winRate: defaultWinRate,
						minVolume: defaultMinVolume,
						// athPercent: defaultATHPercent,
						status: BotStatus.UsualMode,
						isPaused: false,
						chatId: chatId,
						subscription_created_at: Number(_data.created_at),
						subscription_expires_in: Number(_data.expires_in),
						subscription_code: code
					})
					console.log("Added client data correctly")
					return true;
				}
			}
		}
	} catch (error) {
		console.log("Verify subscription code error: ", error);
	}
	return false;
}