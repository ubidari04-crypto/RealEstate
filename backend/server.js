
import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import User from "./models/user.model.js";
import Chat from "./models/chat.model.js";

// Import routes
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import propertyRouter from "./routes/property.routes.js";
import inquiryRouter from "./routes/inquiry.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import chatRouter from "./routes/chat.routes.js";
import contactRouter from "./routes/contact.routes.js";
import adminRouter from "./routes/admin.routes.js";
import recommendationRouter from "./routes/recommendation.routes.js";
import bookingRouter from "./routes/booking.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
connectDB();

// Allowed frontend origins
const allowedOrigins = ["http://localhost:5173"];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ------------------------------------------
// API ROUTES
// ------------------------------------------

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/property", propertyRouter);
app.use("/api/inquiry", inquiryRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRouter);
app.use("/api/contact", contactRouter);
app.use("/api/recommendations", recommendationRouter);

// Khalti booking and payment routes
app.use("/api/booking", bookingRouter);

// Home route
app.get("/", (req, res) => {
  res.send("API WORKING");
});

// ------------------------------------------
// HTTP SERVER
// ------------------------------------------

const server = http.createServer(app);

// ------------------------------------------
// SOCKET.IO SETUP
// ------------------------------------------

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ------------------------------------------
// SOCKET.IO AUTHENTICATION
// ------------------------------------------

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    if (user.isBlocked) {
      return next(new Error("Your account has been blocked"));
    }

    socket.data.userId = user._id.toString();
    socket.data.user = user;

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Invalid or expired authentication token"));
  }
});

// ------------------------------------------
// SOCKET.IO CONNECTION
// ------------------------------------------

io.on("connection", (socket) => {
  console.log("Authenticated user connected:", socket.data.userId);

  // Join a chat only if the user is a participant
  socket.on("joinChat", async (chatId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return socket.emit("chatError", {
          message: "Invalid chat ID",
        });
      }

      const chat = await Chat.findById(chatId);

      if (!chat) {
        return socket.emit("chatError", {
          message: "Chat not found",
        });
      }

      const userId = socket.data.userId;

      const isParticipant =
        chat.buyer.toString() === userId ||
        chat.seller.toString() === userId;

      if (!isParticipant) {
        return socket.emit("chatError", {
          message: "You are not authorized to join this chat",
        });
      }

      socket.join(chatId.toString());

      console.log(`User ${userId} joined chat ${chatId}`);
    } catch (error) {
      console.error("Join chat error:", error);

      socket.emit("chatError", {
        message: "Unable to join chat",
      });
    }
  });

  // Broadcast an already-saved message to the other participant
  socket.on("sendMessage", async (data) => {
    try {
      if (
        !data?.chatId ||
        !mongoose.Types.ObjectId.isValid(data.chatId) ||
        !data?._id ||
        !mongoose.Types.ObjectId.isValid(data._id)
      ) {
        return socket.emit("chatError", {
          message: "Invalid message information",
        });
      }

      const chat = await Chat.findById(data.chatId).populate(
        "messages.sender",
        "name profilePic"
      );

      if (!chat) {
        return socket.emit("chatError", {
          message: "Chat not found",
        });
      }

      const userId = socket.data.userId;

      const isParticipant =
        chat.buyer.toString() === userId ||
        chat.seller.toString() === userId;

      if (!isParticipant) {
        return socket.emit("chatError", {
          message: "You are not authorized to send messages in this chat",
        });
      }

      // Only allow messages saved by this authenticated user
      const savedMessage = chat.messages.id(data._id);

      if (!savedMessage) {
        return socket.emit("chatError", {
          message: "Saved message not found",
        });
      }

      if (savedMessage.sender?._id?.toString() !== userId) {
        return socket.emit("chatError", {
          message: "Message sender verification failed",
        });
      }

      // Make sure the socket has joined this chat room
      if (!socket.rooms.has(data.chatId.toString())) {
        return socket.emit("chatError", {
          message: "Join the chat before sending messages",
        });
      }

      const messageData = {
        chatId: chat._id.toString(),
        ...savedMessage.toObject(),
      };

      // Do not send the message back to the sender.
      socket.to(chat._id.toString()).emit("receiveMessage", messageData);

    } catch (error) {
      console.error("Socket send message error:", error);

      socket.emit("chatError", {
        message: "Unable to deliver message",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.data.userId);
  });
});

// ------------------------------------------
// START SERVER
// ------------------------------------------

server.listen(PORT, () => {
  console.log(`Server Started on http://localhost:${PORT}`);
});
