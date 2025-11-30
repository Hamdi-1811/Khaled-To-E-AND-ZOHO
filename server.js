import express from "express";
import path from "path";

const app = express();
app.use(express.static("public"));

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zoho Sales Assistant LIVE on ${PORT}`));
