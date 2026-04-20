
import express from 'express';
import 'dotenv/config';
import bodyParser from 'body-parser';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const port = 3001;

// IMPORTANT: In a real production environment, use environment variables for sensitive data.
const redisUrl = `rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
console.log("[server] redisUrl:", redisUrl);

let redis: Redis;
try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 2, // Try to reconnect twice on connection failure
    connectTimeout: 5000,    // 5 seconds connection timeout
  });

  redis.on('connect', () => {
    console.log('[redis] Connected to Redis.');
  });

  redis.on('error', (err) => {
    console.error('[redis] Redis connection error:', err);
  });

} catch (error) {
    console.error("[redis] Failed to create Redis instance:", error);
}


app.use(cors());
app.use(bodyParser.json());

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("[server] login request:", username, password);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const storedPasswordRaw = await redis.hget("bogda:config", username);
    // Trim quotes from the stored password if they exist
    const storedPassword = storedPasswordRaw ? storedPasswordRaw.replace(/^"|"$/g, '') : null;

    console.log("[server] storedPassword (trimmed):", storedPassword);

    if (storedPassword === password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('[server] Error during login:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`[server] Server is running on http://localhost:${port}`);
});

