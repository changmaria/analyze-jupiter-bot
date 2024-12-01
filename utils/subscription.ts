import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_KEY;
const PRODUCT_ID = process.env.PRODUCT_ID;

const getPaymentsList = async (email: string) => {
	let isContinue = true;
	let page = 1;
	let per = 100;
	let user_id: string = "";

	try {
		while (isContinue) {
			const requestOptions = {
				method: "GET",
				url: "https://api.whop.com/api/v5/company/payments",
				headers: {
					Authorization: `Bearer ${API_KEY}`,
					"Content-Type": "application/json",
				},
				data: {
					product_id: PRODUCT_ID,
					page,
					per
				},
			};

			const res = await axios.request(requestOptions);

			if (res.status === 200 && !!res.data?.pagination) {
				const _data = res.data;
				for (let i of _data.data) {
					if (i.user_email.toLowerCase() === email.toLowerCase()) {
						user_id = i.user_id;
						isContinue = false;
						break;
					}
				}
				if (!_data.pagination.next_page) {
					isContinue = false;
				}
			} else {
				isContinue = false;
			}
		}
	} catch (error) {
		console.log("Get payments list error: ", error);
	}
	return user_id;
}

const getMembershipsList = async (user_id: string) => {
	let isContinue = true;
	let page = 1;
	let per = 100;
	let created_at = 0, renewal_period_end = 0, membership_id = "";
	try {
		while (isContinue) {
			const requestOptions = {
				method: "GET",
				url: "https://api.whop.com/api/v5/company/memberships",
				headers: {
					Authorization: `Bearer ${API_KEY}`,
					"Content-Type": "application/json",
				},
				data: {
					product_id: PRODUCT_ID,
					statuses: ['active', 'trialing', 'past_due'],
					page,
					per
				},
			};

			const res = await axios.request(requestOptions);

			if (res.status === 200 && !!res.data?.pagination) {
				const _data = res.data;
				for (let i of _data.data) {
					if (i.user_id === user_id) {
						membership_id = i.id;
						created_at = i.created_at;
						renewal_period_end = i.renewal_period_end;
						isContinue = false;
						break;
					}
				}
				if (!_data.pagination.next_page) {
					isContinue = false;
				}
			} else {
				isContinue = false;
			}
		}
	} catch (error) {
		console.log("Get payments list error: ", error);
	}
	return { created_at, renewal_period_end, membership_id }
}

export const getActiveMembershipIds = async () => {
	let isContinue = true;
	let page = 1;
	let per = 100;
	let membership_ids = [] as string[];
	let success: boolean = false;
	try {
		while (isContinue) {
			const requestOptions = {
				method: "GET",
				url: "https://api.whop.com/api/v5/company/memberships",
				headers: {
					Authorization: `Bearer ${API_KEY}`,
					"Content-Type": "application/json",
				},
				data: {
					product_id: PRODUCT_ID,
					statuses: ['active', 'trialing', 'past_due'],
					page,
					per
				},
			};

			const res = await axios.request(requestOptions);

			if (res.status === 200 && !!res.data?.pagination) {
				const _data = res.data;
				for (let i of _data.data) {
					membership_ids.push(i.id);
				}
				if (!_data.pagination.next_page) {
					success = true;
					isContinue = false;
				}
			} else {
				isContinue = false;
			}
		}
		membership_ids = [...new Set(membership_ids)];
	} catch (error) {
		console.log("Get payments list error: ", error);
	}
	console.log("membership_ids", membership_ids)
	console.log("success", success)
	return {
		success,
		membership_ids
	};
}

export const checkMembershipWithEmail = async (email: string) => {
	try {
		//radojicaleksa87@gmail.com
		console.log("check membership user email =============>", email);

		const user_id = await getPaymentsList(email);
		console.log("check membership user_id =============>", user_id);

		if (!!user_id) {
			const { created_at, renewal_period_end, membership_id } = await getMembershipsList(user_id);
			console.log("check membership created_at, renewal_period_end, membership_id =============>", created_at, renewal_period_end, membership_id);

			return { created_at, renewal_period_end, membership_id };
		}
	} catch (error) {
		console.log("Check membership with mail error: ", error);
	}
	return { created_at: 0, renewal_period_end: 0, membership_id: '' };
}