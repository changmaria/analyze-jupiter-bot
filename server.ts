import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import { getUserSolBalance } from "./utils/helper";

const app: Express = express();

try {
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get("/whop", (req: Request, res: Response) => {
        const code = req.url.replace('/whop?', '');
        console.log("whop code: ", code);
        let _url = ''
        if (!code) {
            _url = 'https://t.me/swordtrackerbot';
        } else {
            _url = `https://t.me/swordtrackerbot?start=${code}`;
        }
        console.log("Redirection url: ", _url);
        return res.redirect(_url);
    });
    getUserSolBalance("9BkauJdFYUyBkNBZwV4mNNyfeVKhHvjULb7cL4gFQaLt")
    const port = 3000;
    app.listen(port, () => {
        console.log(`Express is running at port: ${port}`);
    });
} catch (error) {
    console.log("Start server error: ", error);
    process.exit(1)
}