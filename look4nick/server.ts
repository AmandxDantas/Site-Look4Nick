import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dns from "dns";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helper for MD5
const getMd5 = (text: string) => crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex');

// API route for Username search
app.post("/api/search/username", async (req, res) => {
  const { username, sites } = req.body;

  if (!username || !sites || !Array.isArray(sites)) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  const results = [];
  const batchSize = 5; // Smaller batch for more stability

  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    const batchPromises = batch.map(async (site: any) => {
      const url = site.url.replace("{username}", username);
      try {
        const response = await axios.get(url, {
          timeout: 8000, // Increased timeout
          validateStatus: () => true,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
          }
        });

        let status: 'found' | 'not_found' | 'uncertain' = 'not_found';
        const pageContent = response.data.toString();

        // Check for error message
        const hasErrorMsg = site.errorMsg && pageContent.toLowerCase().includes(site.errorMsg.toLowerCase());
        const hasSuccessMsg = site.successMsg ? pageContent.toLowerCase().includes(site.successMsg.toLowerCase()) : true;

        if (response.status === 200) {
          if (hasErrorMsg) {
            status = 'not_found';
          } else if (hasSuccessMsg) {
            status = 'found';
          } else {
            status = 'uncertain';
          }
        } else if (response.status === 404) {
          status = 'not_found';
        } else {
          status = 'uncertain';
        }

        return { name: site.name, url, status, details: `HTTP ${response.status}`, category: site.category };
      } catch (error: any) {
        let details = "Error";
        if (error.code === 'ECONNABORTED') details = "Timeout";
        else if (error.code === 'ENOTFOUND') details = "DNS Error";
        
        return { name: site.name, url, status: 'uncertain' as const, details, category: site.category };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  res.json({ results });
});

// API route for Email search
app.post("/api/search/email", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const results = [];
  const domain = email.split("@")[1];

  // 1. DNS / MX Record Validation
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      results.push({ name: "DNS/MX Record", status: "found", details: `Domain ${domain} has valid mail servers.` });
    }
  } catch (error) {
    results.push({ name: "DNS/MX Record", status: "not_found", details: `Domain ${domain} does not appear to have valid mail servers.` });
  }

  // 2. Gravatar Check
  const emailHash = getMd5(email);
  try {
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404`;
    const response = await axios.get(gravatarUrl, { validateStatus: () => true });
    if (response.status === 200) {
      results.push({ 
        name: "Gravatar", 
        status: "found", 
        url: `https://en.gravatar.com/${emailHash}`,
        details: "Profile found on Gravatar." 
      });
    }
  } catch (error) {}

  // 3. HaveIBeenPwned (HIBP) - Requires API Key
  const hibpKey = process.env.HIBP_API_KEY;
  if (hibpKey) {
    try {
      const hibpUrl = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`;
      const response = await axios.get(hibpUrl, {
        headers: { "hibp-api-key": hibpKey, "user-agent": "Look4Nick-App" },
        validateStatus: () => true
      });
      if (response.status === 200) {
        results.push({ 
          name: "HaveIBeenPwned", 
          status: "found", 
          details: `Found in ${response.data.length} data breaches.` 
        });
      } else if (response.status === 404) {
        results.push({ name: "HaveIBeenPwned", status: "not_found", details: "No breaches found." });
      }
    } catch (error) {}
  } else {
    results.push({ name: "HaveIBeenPwned", status: "not_found", details: "HIBP API Key not configured." });
  }

  // 4. Adobe / Social Media Recovery Simulation (Mock/Safe logic)
  // In a real scenario, we'd check if the email is registered on common platforms
  // For this demo, we'll check a few public endpoints that allow checking existence
  const platforms = [
    { name: "Adobe", url: "https://auth.services.adobe.com/signin/v2/users/accounts" }
  ];
  // Note: Most modern platforms have strict rate limiting or require CSRF for this.
  // We'll stick to confirmed API-based results for now to avoid false positives.

  res.json({ results });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
