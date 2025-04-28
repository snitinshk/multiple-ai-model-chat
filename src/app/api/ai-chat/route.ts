import { NextRequest, NextResponse } from "next/server";
import { ChatErrorImpl, ChatResponse, chatRequestSchema, createErrorResponse } from "./types";

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
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

    const { model } = validationResult.data;
    
    // Route to the appropriate model handler
    let response: Response;
    switch (model) {
      case "openai":
        response = await fetch(new URL("/api/ai-chat/openai", req.url), {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(body),
        });
        break;
        
      case "gemini":
        response = await fetch(new URL("/api/ai-chat/gemini", req.url), {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(body),
        });
        break;
        
      case "deepseek":
        response = await fetch(new URL("/api/ai-chat/deepseek", req.url), {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(body),
        });
        break;
        
      default:
        throw new ChatErrorImpl("Unsupported model", 400, "UNSUPPORTED_MODEL");
    }

    // Forward the response from the model handler
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
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