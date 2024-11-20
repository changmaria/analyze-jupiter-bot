import axios from "axios";
import { defaultATHPercent, defaultMinVolume, defaultWinRate, getClientData, getExsitSubscriptionCode, updateClientData } from "./mongodb";
import { BotStatus } from "./interface";

const CLIENT_ID = "VCfoezOe279y30mLKuO3PQDzIU10YWhkzo6Q56Dq9AE";
const CLIENT_SECRET = "jJtU8jUZvpw9eJ_sOo8XQtmzz5GXpg2M0Ngp8cr9HxA";

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
					redirect_uri: "https://9494-83-234-227-20.ngrok-free.app/whop"
				},
			};

			const res = await axios.request(requestOptions);

			console.log("verify - res: ", res);

			if (res.status === 200 && !!res.data?.access_token) {
				const _data = res.data;
				const _exist_code = await getExsitSubscriptionCode(code);
				if (!_exist_code) {
					const client = await getClientData(tgUsername);
					await updateClientData({
						name: tgUsername,
						winRate: client?.winRate || defaultWinRate,
						minVolume: client?.minVolume || defaultMinVolume,
						athPercent: client?.athPercent || defaultATHPercent,
						status: BotStatus.UsualMode,
						chatId: chatId,
						subscription_created_at: Number(_data.created_at),
						subscription_expires_in: Number(_data.expires_in),
						subscription_code: code
					})
					return true;
				}
			}
		}
	} catch (error) {
		console.log("Verify subscription code error: ", error);
	}
	return false;
}