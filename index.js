var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
require('dotenv').config();
var _a = require('@solana/web3.js'), Connection = _a.Connection, sendAndConfirmTransaction = _a.sendAndConfirmTransaction, Keypair = _a.Keypair, LAMPORTS_PER_SOL = _a.LAMPORTS_PER_SOL, SystemProgram = _a.SystemProgram, PublicKey = _a.PublicKey, Transaction = _a.Transaction, TransactionSignature = _a.TransactionSignature;
var bs58 = require('bs58');
// const fetch = require('node-fetch');
// console.log("private==>", process.env.walletKey);
var wallet = Keypair.fromSecretKey(bs58.default.decode(process.env.walletKey));
var connection = new Connection('https://proportionate-distinguished-bush.solana-mainnet.quiknode.pro/23d40a5fef0e147c06129a62e0cc0b975f38fd42');
var receiver = new PublicKey('34vTq3GQxK6pgEbhnrgU1zs27gPWS6ZttxrYofDR4EkD');
var jupiterProgram = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
var axios = require('axios');
// Jupiter Swap : JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
// connection.onLogs(jupiterProgram, async (logs, ctx) => {
//     console.log("logs ===>", logs);
//     const data = await connection.getParsedTransaction(logs.signature, 'confirmed');
//     console.log("data ===>", data);
//     return ;
// })
var getTokenDataFromCoinGecko = function () { return __awaiter(_this, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, axios.get('https://pro-api.coingecko.com/api/v3/coins/compound-governance-token', {
                    headers: {
                        'accept': "application/json",
                        'x-cg-pro-api-key': 'CG-ww38dvoPhso7kYTyXbLrMQ8h'
                    }
                })
                // console.log("coin data ===>", data);
            ];
            case 1:
                data = _a.sent();
                // console.log("coin data ===>", data);
                console.log("current price ===>", data.data.market_data.current_price.usd);
                console.log("ath price ===>", data.data.market_data.ath.usd);
                return [2 /*return*/];
        }
    });
}); };
getTokenDataFromCoinGecko();
// 4MnkotHWKfS5c6Q1HibrGaCQAsKiEeQy8Gzb5qWrjELpNjwg8XiDAvwnYaGFP6JgHu7ms9ymt6Yg9DWEyppxNMnk
// 4bjrF3jC39AuSZTBbJ54DW6j9wjf9dDcjSSEQafXwGF6ewKgYGisZgGufL32SByw7MAQcqyGKLYePuYAhmnauaET
var analyzeSignature = function () { return __awaiter(_this, void 0, void 0, function () {
    var transactionSignature, data, transferInstructions, i, j, temp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                transactionSignature = '4MnkotHWKfS5c6Q1HibrGaCQAsKiEeQy8Gzb5qWrjELpNjwg8XiDAvwnYaGFP6JgHu7ms9ymt6Yg9DWEyppxNMnk';
                return [4 /*yield*/, connection.getParsedTransaction(transactionSignature, {
                        maxSupportedTransactionVersion: 0
                    })];
            case 1:
                data = _a.sent();
                transferInstructions = [];
                for (i = 0; i < data.meta.innerInstructions.length; i++) {
                    // console.log(`${i} ===>`, data.meta.innerInstructions[i]);
                    for (j = 0; j < data.meta.innerInstructions[i].instructions.length; j++) {
                        temp = data.meta.innerInstructions[i].instructions[j].parsed;
                        if (temp == undefined)
                            continue;
                        if (temp.type == "transfer")
                            transferInstructions.push(temp.info);
                        console.log("data ===>", temp);
                    }
                }
                console.log("transfer instructions ===>", transferInstructions);
                return [2 /*return*/];
        }
    });
}); };
// analyzeSignature();
