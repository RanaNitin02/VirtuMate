import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import cors from 'cors'
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: "https://virtumate.onrender.com";
    credentials: true,
}));


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);


app.listen(port,() => {
    connectDB();
    console.log(`Server started at port ${port}...`);
})
