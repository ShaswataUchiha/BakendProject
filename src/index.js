import dotenv from "dotenv"
import connectDatabase from "./db/index.js";

dotenv.config({
    path: "./env"
})

connectDatabase()
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on((error) => {
//             console.log("Database error: " + error)
//         })
//         app.listen(process.env.PORT, () => {
//             console.log("App is listening on port " + process.env.PORT)
//         })
//     } catch (error) {
//         console.log("Error: " + error)
//         throw new Error
//     }
// })();