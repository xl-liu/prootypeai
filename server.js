import express from "express";
import fs from "fs";
import { exec as execCallback } from "child_process";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Add body parser middleware
app.use(express.json());

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

app.post("/render", async (req, res) => {
  try {
    const { code } = req.body;

    // Create temp directory and files
    // Create temp directory if it doesn't exist
    if (!fs.existsSync("./temp")) {
      fs.mkdirSync("./temp");
    }
    const tmpdir = fs.mkdtempSync("./temp/circuit-");
    const texPath = `${tmpdir}/circuit.tex`;
    const pdfPath = `${tmpdir}/circuit.pdf`;
    const pngPath = `${tmpdir}/circuit.png`;

    // Wrap the circuit code in a standalone environment
    const wrappedCode = `\\documentclass[preview,border=1pt]{standalone}
\\usepackage{circuitikz}
\\begin{document}
${code}
\\end{document}`;

    // Write LaTeX file
    fs.writeFileSync(texPath, wrappedCode);

    // Compile LaTeX to PDF
    await new Promise((resolve, reject) => {
      execCallback(`cd ${tmpdir} && pdflatex circuit.tex`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    // Convert PDF to PNG
    await new Promise((resolve, reject) => {
      execCallback(`convert -density 300 ${pdfPath} ${pngPath}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Read PNG and convert to base64
    const imageData = fs.readFileSync(pngPath, "base64");
    const pdfData = fs.readFileSync(pdfPath, "base64");
    // Cleanup temp directory
    fs.rmSync(tmpdir, { recursive: true, force: true });

    res.json({ image: imageData, pdf: pdfData });
  } catch (error) {
    console.error("Diagram generation error:", error);
    res.status(500).json({ error: "Failed to generate diagram" });
  }
});

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "ballad",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
