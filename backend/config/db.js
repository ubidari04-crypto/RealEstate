import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect("mongodb+srv://umangabidari53_db_user:Y1e2tZGEA3awusdb@cluster0.lgnqs6s.mongodb.net/RealState")
    .then(() => {
        console.log("DB CONNECTED");
    
    })
}