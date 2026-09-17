import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

import { readContacts, writeContacts } from "./utils/store.js";
import { buildRecommendations } from "./utils/recommendationService.js";
import { generateMessage } from "./utils/messageService.js";
import { validateContact, normalizeContact, isDuplicateEmail } from "./utils/validation.js";
import { createRateLimiter } from "./utils/rateLimit.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", true);
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.use((err, _req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

function asyncHandler(handler) {
  return (req, res, next) => handler(req, res, next).catch(next);
}

const generateMessageLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const MAX_MESSAGE_FIELD_LENGTH = 200;

app.get("/", (_req, res) => {
  res.send("AI Contact Reminder backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get(
  "/contacts",
  asyncHandler(async (_req, res) => {
    const contacts = await readContacts();
    res.json(contacts);
  })
);

app.post(
  "/contacts",
  asyncHandler(async (req, res) => {
    const error = validateContact(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const contacts = await readContacts();

    if (isDuplicateEmail(contacts, req.body.email)) {
      return res.status(409).json({ error: "A contact with this email already exists" });
    }

    const newContact = {
      id: crypto.randomUUID(),
      ...normalizeContact(req.body)
    };

    contacts.push(newContact);
    await writeContacts(contacts);

    res.status(201).json(newContact);
  })
);

app.put(
  "/contacts/:id",
  asyncHandler(async (req, res) => {
    const error = validateContact(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const contacts = await readContacts();
    const index = contacts.findIndex((contact) => contact.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (isDuplicateEmail(contacts, req.body.email, req.params.id)) {
      return res.status(409).json({ error: "A contact with this email already exists" });
    }

    contacts[index] = { ...contacts[index], ...normalizeContact(req.body) };
    await writeContacts(contacts);

    res.json(contacts[index]);
  })
);

app.delete(
  "/contacts/:id",
  asyncHandler(async (req, res) => {
    const contacts = await readContacts();
    const filtered = contacts.filter((contact) => contact.id !== req.params.id);

    if (filtered.length === contacts.length) {
      return res.status(404).json({ error: "Contact not found" });
    }

    await writeContacts(filtered);
    res.json({ success: true });
  })
);

app.get(
  "/recommendations",
  asyncHandler(async (_req, res) => {
    const contacts = await readContacts();

    if (!contacts.length) {
      return res.json([]);
    }

    const recommendations = buildRecommendations(contacts).map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      company: contact.company,
      notes: contact.notes,
      lastContactedDate: contact.lastContactedDate,
      reason: contact.reason,
      daysSinceLastContact: contact.daysSinceLastContact
    }));

    res.json(recommendations);
  })
);

app.post(
  "/generate-message",
  generateMessageLimiter,
  asyncHandler(async (req, res) => {
    const { contactName, relationshipContext, lastConversation, company } = req.body;

    if (!contactName || !relationshipContext || !lastConversation) {
      return res.status(400).json({
        error: "contactName, relationshipContext, and lastConversation are required"
      });
    }

    const fields = { contactName, relationshipContext, lastConversation, company };
    const tooLong = Object.entries(fields).some(
      ([, value]) => typeof value === "string" && value.length > MAX_MESSAGE_FIELD_LENGTH
    );

    if (tooLong) {
      return res.status(400).json({
        error: `Each field must be ${MAX_MESSAGE_FIELD_LENGTH} characters or fewer`
      });
    }

    const message = await generateMessage({
      contactName,
      relationshipContext,
      lastConversation,
      company
    });

    res.json({ message });
  })
);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
