// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Please set the OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);
const knowledgeBase = require("./supervity_data.json");

function retrieveRelevantInfo(question) {
  const lowerCaseQuestion = question.toLowerCase();
  const knowledgeContent = knowledgeBase.content;
  const contentSegments = knowledgeContent.split(/(?<=[.?!])\s+/);
  const questionWords = lowerCaseQuestion.split(/\s+/);
  const relevantSegments = contentSegments.filter((segment) => {
    const lowerCaseSegment = segment.toLowerCase();
    return questionWords.some((word) => lowerCaseSegment.includes(word));
  });
  return relevantSegments.join(" ") || knowledgeContent;
}

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const audioFilePath = req.file.path;
    const audioFile = fs.createReadStream(audioFilePath);
    const transcriptionResponse = await openai.createTranscription(
      audioFile,
      "whisper-1"
    );
    const transcribedText = transcriptionResponse.data.text;
    fs.unlinkSync(audioFilePath);

    const context = retrieveRelevantInfo(transcribedText);
    const messages = [
      {
        role: "system",
        content: "You are an AI assistant. Use the following context to answer the question.",
      },
      {
        role: "system",
        content: `Context:\n${context}`,
      },
      {
        role: "user",
        content: transcribedText,
      },
    ];

    const gptResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const generatedAnswer = gptResponse.data.choices[0].message.content.trim();
    res.json({ transcription: transcribedText, response: generatedAnswer });
  } catch (error) {
    console.error("Error during processing:", error.response?.data || error.message);
    res.status(500).json({ error: "Error during processing" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
