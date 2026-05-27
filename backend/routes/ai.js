const express = require("express");
const { Company, Item, Transaction } = require("../models");
const { protect }             = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post("/chat", protect, async (req, res) => {
  try {
    const { prompt, history = [] } = req.body;
    if (!prompt) return res.status(400).json({ message: "No prompt provided" });

    const cid     = req.user.companyId;
    const company = await Company.findById(cid).select("name baseCurrency industry features");

    const [items, txs] = await Promise.all([
      Item.find({ companyId: cid })
        .select("name nameEn sku qty minThreshold status price").limit(200),
      Transaction.find({ companyId: cid }).sort({ date: -1 }).limit(30)
        .populate("itemId", "name nameEn")
        .select("type qty date notes userId"),
    ]);

    const lowStock  = items.filter(i => i.qty > 0 && i.qty <= (i.minThreshold || 5));
    const outStock  = items.filter(i => i.qty === 0);
    const totalVal  = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);

    const systemPrompt = `You are an intelligent inventory assistant for "${company?.name || "this company"}".
Currency: ${company?.baseCurrency || "USD"}.
Industry: ${company?.industry || "Unknown"}.
Features Enabled: Projects: ${company?.features?.projects ? 'Yes' : 'No'}, Reasons: ${company?.features?.reasons ? 'Yes' : 'No'}.
Today: ${new Date().toISOString().split("T")[0]}.

CURRENT INVENTORY SNAPSHOT:
- Total SKUs: ${items.length}
- Total stock value: ${totalVal.toFixed(2)} ${company?.baseCurrency || "USD"}
- Low stock items (${lowStock.length}): ${lowStock.map(i => `${i.nameEn || i.name} (qty:${i.qty})`).join(", ") || "none"}
- Out of stock (${outStock.length}): ${outStock.map(i => `${i.nameEn || i.name}`).join(", ") || "none"}

LAST 30 TRANSACTIONS:
${txs.map(tx => `[${new Date(tx.date).toLocaleDateString()}] ${tx.type} ${tx.qty}x ${tx.itemId?.nameEn || tx.itemId?.name || "?"} ${tx.notes ? `(${tx.notes})` : ""}`).join("\n")}

TOP ITEMS BY VALUE:
${items.sort((a, b) => (b.price * b.qty) - (a.price * a.qty)).slice(0, 10).map(i =>
  `${i.nameEn || i.name}: ${i.qty} units @ ${i.price || 0} = ${((i.price || 0) * (i.qty || 0)).toFixed(2)}`
).join("\n")}

You have access to Google Search. You can use it to find the best solutions, trends, or recommendations specific to the company's industry. If the user asks for advice or solutions, search the internet to provide up-to-date and highly relevant business solutions.
Be concise, helpful, and data-driven. Answer in the same language the user writes in. Use bullet points when listing items.`;

    // ── Try Gemini if API key is present ──────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = require("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          tools: [{ googleSearch: {} }],
          contents: systemPrompt + "\n\nConversation history:\n" +
            history.map(m => `User: ${m.user}\nAssistant: ${m.bot}`).join("\n") +
            `\n\nUser: ${prompt}`,
        });
        return res.json({ response: response.text });
      } catch (aiErr) {
        console.error("Gemini error:", aiErr.message);
        // Fall through to smart simulation
      }
    }

    // ── Smart simulation (no API key — uses real data) ────────────────────────
    const lower = prompt.toLowerCase();
    let response;

    if (lower.includes("low") || lower.includes("منخفض")) {
      response = lowStock.length > 0
        ? `📦 **Low Stock Alert** — ${lowStock.length} item(s) need attention:\n${lowStock.map(i => `• ${i.nameEn || i.name}: only **${i.qty}** units left`).join("\n")}`
        : "✅ All items are well-stocked. No low stock alerts at this time.";
    } else if (lower.includes("out") || lower.includes("نفد")) {
      response = outStock.length > 0
        ? `🚨 **Out of Stock** — ${outStock.length} item(s) have zero quantity:\n${outStock.map(i => `• ${i.nameEn || i.name}`).join("\n")}`
        : "✅ No items are completely out of stock.";
    } else if (lower.includes("value") || lower.includes("worth") || lower.includes("قيمة")) {
      response = `💰 **Total Inventory Value**: ${totalVal.toFixed(2)} ${company?.baseCurrency || "USD"}\n\nTop 5 by value:\n${
        items.sort((a, b) => (b.price * b.qty) - (a.price * a.qty)).slice(0, 5)
          .map(i => `• ${i.nameEn || i.name}: ${((i.price || 0) * (i.qty || 0)).toFixed(2)}`).join("\n")
      }`;
    } else if (lower.includes("recent") || lower.includes("today") || lower.includes("اليوم")) {
      const todayTxs = txs.filter(tx => new Date(tx.date).toDateString() === new Date().toDateString());
      response = todayTxs.length > 0
        ? `📋 **Today's Transactions** (${todayTxs.length}):\n${todayTxs.map(tx => `• ${tx.type} ${tx.qty}x ${tx.itemId?.nameEn || tx.itemId?.name || "?"}`).join("\n")}`
        : `No transactions recorded today. Last activity: ${txs[0] ? new Date(txs[0].date).toLocaleDateString() : "none"}`;
    } else if (lower.includes("total") || lower.includes("count") || lower.includes("كم")) {
      response = `📊 **Inventory Summary**:\n• Total SKUs: **${items.length}** items\n• Low stock: **${lowStock.length}** items\n• Out of stock: **${outStock.length}** items\n• Total value: **${totalVal.toFixed(2)} ${company?.baseCurrency || "USD"}**`;
    } else {
      response = `I can help you with your inventory at **${company?.name}**! Try asking:\n• "What items are low on stock?"\n• "What's my total inventory value?"\n• "What transactions happened today?"\n• "Which items are out of stock?"\n\n*(Connect a Gemini API key in .env for full AI capabilities.)*`;
    }

    res.json({ response });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
