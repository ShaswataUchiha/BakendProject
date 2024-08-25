import dotenv from "dotenv"
import connectDatabase from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env"
})

connectDatabase()
.then(() => {
    app.on("error", (err) => {
        console.error(`Error in server: ${err.stack}`);
        throw err;
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(
            console.log(`Server started at ${process.env.PORT}`)
        )
    })
})
.catch((err) => {
    console.log("MONGO db connection error : " + err)
})