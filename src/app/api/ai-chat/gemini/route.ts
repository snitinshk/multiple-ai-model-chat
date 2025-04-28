import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from '@google/genai';
import { ChatErrorImpl, ChatResponse, chatRequestSchema, createErrorResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const config = {
  model: 'gemini-2.0-flash-001',
};

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new ChatErrorImpl(
        "Gemini API key is not configured",
        500,
        "CONFIGURATION_ERROR",
        undefined,
        "Please configure your Gemini API key in the environment variables."
      );
    }

    const body = await req.json();
    console.log("Raw request body:", body);
    
    const cleanedMessages = body.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content?.trim() || "",
    }));
    
    console.log("Cleaned messages:", cleanedMessages);
    
    const validationResult = chatRequestSchema.safeParse({
      ...body,
      messages: cleanedMessages,
    });
    
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error);
      throw new ChatErrorImpl(
        "Invalid request format",
        400,
        "VALIDATION_ERROR",
        validationResult.error,
        "Please check your message format and try again."
      );
    }

    const { messages, stream } = validationResult.data;
    console.log("Initializing Gemini client...");

    try {
      // Format messages for Gemini
      const contents = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      console.log("Sending request to Gemini...");
      
      if (stream) {
        console.log("Processing streaming response...");
        const response = await ai.models.generateContentStream({
          model: config.model,
          contents: contents,
        });

        let fullContent = "";
        for await (const chunk of response) {
          if (chunk.text) {
            fullContent += chunk.text;
          }
        }
        console.log("Gemini streaming response received successfully");
        return NextResponse.json({ reply: fullContent });
        
      } else {
        console.log("Processing non-streaming response...");
        const response = await ai.models.generateContent({
          model: config.model,
          contents: contents,
        });

        const reply = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Gemini response received successfully");
        console.log(reply);
        console.log("**************************************************");
        return NextResponse.json({ reply });
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      const chatError = createErrorResponse(error, "Failed to get response from Gemini");
      return NextResponse.json(
        { 
          reply: "", 
          error: chatError.message,
          errorType: chatError.type,
          suggestion: chatError.suggestion,
          details: chatError.details
        },
        { status: chatError.statusCode }
      );
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    const chatError = createErrorResponse(error);
    return NextResponse.json(
      { 
        reply: "", 
        error: chatError.message,
        errorType: chatError.type,
        suggestion: chatError.suggestion,
        details: chatError.details
      },
      { status: chatError.statusCode }
    );
  }
} 