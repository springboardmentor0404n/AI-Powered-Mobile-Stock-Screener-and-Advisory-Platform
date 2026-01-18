// server.js
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./db"); // database file

const app = express();
app.use(express.json());

const JWT_SECRET = "your_secret_key";

// ----------------------- LOGIN ROUTE -----------------------
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query(
            "SELECT * FROM authentication WHERE uname = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid username" });
        }

        const user = result.rows[0];

        if (password !== user.password) {
            return res.status(400).json({ message: "Wrong password" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.uname },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({ token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ----------------------- AUTH MIDDLEWARE -----------------------
function auth(req, res, next) {
    const header = req.headers["authorization"];
    if (!header) return res.status(401).json({ message: "No token provided" });

    const token = header.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        req.user = decodedUser;
        next();
    });
}

// ----------------------- PROTECTED ROUTE -----------------------
app.get("/protected", auth, (req, res) => {
    res.json({
        message: "Protected route accessed",
        user: req.user
    });
});

// ----------------------- START SERVER -----------------------
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
