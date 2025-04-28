import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { ChatErrorImpl, ChatResponse, chatRequestSchema, createErrorResponse } from "../types";

const config = {
  endpoint: "https://api.deepseek.com/chat/completions",
  model: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 1000,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
};

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new ChatErrorImpl(
        "DeepSeek API key is not configured",
        500,
        "CONFIGURATION_ERROR",
        undefined,
        "Please configure your DeepSeek API key in the environment variables."
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

    const { messages, parameters } = validationResult.data;
    console.log("Preparing DeepSeek request...");

    try {
      const requestBody = {
        model: config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        ...parameters,
      };

      console.log("DeepSeek request body:", JSON.stringify(requestBody, null, 2));
      
      console.log("Sending request to DeepSeek...");
      const res = await axios.post(
        config.endpoint,
        requestBody,
        { headers: config.headers }
      );
      
      console.log("DeepSeek response:", JSON.stringify(res.data, null, 2));
      
      const reply = res.data.choices?.[0]?.message?.content || "";
      console.log("DeepSeek response processed successfully");

      return NextResponse.json({ reply });
    } catch (error) {
      console.error("DeepSeek API Error:", error);
      const chatError = createErrorResponse(error, "Failed to get response from DeepSeek");
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