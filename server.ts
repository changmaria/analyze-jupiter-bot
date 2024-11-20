import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";

const app: Express = express();

try {
    app.use(bodyParser.urlencoded({ extended: false }));
    app.get("/whop", (req: Request, res: Response) => {
        const code = req.url.replace('/whop?', '');
        let _url = ''
        if (!code) {
            _url = 'https://t.me/jupitertrackkbot';
        } else {
            _url = `https://t.me/jupitertrackkbot?start=${code}`;
        }
        return res.redirect(_url);
    });

    const port = 3000;
    app.listen(port, () => {
        console.log(`Express is running at port: ${port}`);
    });
} catch (error) {
    console.log("Start server error: ", error);
    process.exit(1)
}